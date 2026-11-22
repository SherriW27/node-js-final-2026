// M3：教練後台課程管理的商業邏輯與資料存取
const dataSource = require('../db/data-source')
const Course = require('../entities/Course')
const CourseBooking = require('../entities/CourseBooking')
const { AppError, isForeignKeyViolation } = require('../utils')

const courseRepo = dataSource.getRepository(Course)

const COURSE_NOT_FOUND = '課程不存在'

// skill_id 指向不存在的技能：外鍵檢查失敗，當成欄位錯誤
function rethrowForeignKeyAsBadField(err) {
  if (isForeignKeyViolation(err)) {
    throw new AppError(400, '欄位未填寫正確')
  }
  throw err
}

// 開課：開課的教練一律是 token 裡的本人（userId），不接受 body 指定
async function createCourse(userId, fields) {
  let saved
  try {
    saved = await courseRepo.save(courseRepo.create({ ...fields, user_id: userId }))
  } catch (err) {
    rethrowForeignKeyAsBadField(err)
  }
  // 重新查一次：回傳資料庫實際存下的值（例如 +08:00 的時間會統一轉成 UTC）
  return courseRepo.findOneBy({ id: saved.id })
}

// 教練本人開的全部課程
function listCoachCourses(userId) {
  // status 不存進資料表，每次用「現在時間」與起迄時間比較即時算出
  // participants 是「未取消」的報名數（已取消的不計），用子查詢即時計算
  return courseRepo
    .createQueryBuilder('c')
    .select('c.id', 'id')
    .addSelect('c.name', 'name')
    .addSelect('c.start_at', 'start_at')
    .addSelect('c.end_at', 'end_at')
    .addSelect('c.max_participants', 'max_participants')
    .addSelect('c.meeting_url', 'meeting_url')
    .addSelect(
      `CASE
         WHEN now() < c.start_at THEN '尚未開始'
         WHEN now() <= c.end_at THEN '進行中'
         ELSE '已結束'
       END`,
      'status'
    )
    .addSelect(
      (subQuery) =>
        subQuery
          .select('COUNT(*)::int')
          .from(CourseBooking, 'b')
          .where('b.course_id = c.id')
          .andWhere('b.cancelled_at IS NULL'),
      'participants'
    )
    .where('c.user_id = :userId', { userId })
    .orderBy('c.start_at', 'DESC')
    .getRawMany()
}

// 單一課程（只查得到自己的課）
async function getCoachCourse(userId, courseId) {
  // 同時用「課程 id」和「登入者 id」查：不是你的課，等於查不到，不洩漏它存在
  const course = await courseRepo
    .createQueryBuilder('c')
    .innerJoin('c.skill', 's')
    .select('c.id', 'id')
    .addSelect('c.name', 'name')
    .addSelect('c.description', 'description')
    .addSelect('c.start_at', 'start_at')
    .addSelect('c.end_at', 'end_at')
    .addSelect('c.max_participants', 'max_participants')
    .addSelect('s.name', 'skill_name')
    .addSelect('c.skill_id', 'skill_id')
    .addSelect('c.meeting_url', 'meeting_url')
    .where('c.id = :courseId', { courseId })
    .andWhere('c.user_id = :userId', { userId })
    .getRawOne()
  if (!course) {
    throw new AppError(400, COURSE_NOT_FOUND)
  }
  return course
}

// 更新課程（只改得到自己的課）
async function updateCoachCourse(userId, courseId, fields) {
  let result
  try {
    // 條件同時帶 id 與 user_id：不是自己的課，affected 會是 0
    result = await courseRepo.update({ id: courseId, user_id: userId }, fields)
  } catch (err) {
    rethrowForeignKeyAsBadField(err)
  }
  if (result.affected === 0) {
    throw new AppError(400, COURSE_NOT_FOUND)
  }
  return courseRepo.findOneBy({ id: courseId })
}

module.exports = { COURSE_NOT_FOUND, createCourse, listCoachCourses, getCoachCourse, updateCoachCourse }
