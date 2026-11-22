// 全站課程：M4 進行中課程列表、M5 報名與取消報名的商業邏輯
const { IsNull } = require('typeorm')
const dataSource = require('../db/data-source')
const User = require('../entities/User')
const Course = require('../entities/Course')
const CourseBooking = require('../entities/CourseBooking')
const createPublicCourseQuery = require('./publicCourseQuery')
const { getCreditSummary } = require('./creditSummary')
const { AppError, isUniqueViolation } = require('../utils')

// ⚠️ 報名失敗的固定訊息：前端用「逐字比對」決定開哪個提示視窗，多一個字、少一個標點都會壞
// （第四句「請先登入」由 auth middleware 負責）
const BOOKING_MESSAGES = {
  COURSE_NOT_FOUND: 'ID錯誤',
  ALREADY_BOOKED: '已經報名過此課程',
  NO_CREDIT: '已無可使用堂數',
  COURSE_FULL: '已達最大參加人數，無法參加'
}

// 全站「進行中」的課程（start_at <= now < end_at）
// 尚未開始與已結束的都不回；跟教練課表（end_at > now）是不同的條件
function listOngoingCourses() {
  return createPublicCourseQuery()
    .where('c.start_at <= now()')
    .andWhere('now() < c.end_at')
    .orderBy('c.start_at', 'ASC')
    .addOrderBy('c.id', 'ASC')
    .getRawMany()
}

// 報名課程
async function bookCourse(userId, courseId) {
  try {
    // 整個流程包在一個交易裡，並先「鎖列」讓同一堂課、同一個人的報名排隊執行：
    // 沒有鎖的話，兩個人同時搶最後一個名額、或一個人同時報兩堂課搶最後一堂，
    // 都會在「檢查通過」之後才各自寫入，造成超收或餘額變負
    // 中途 throw AppError 會讓交易 ROLLBACK（這時還沒寫入任何東西）
    await dataSource.transaction(async (manager) => {
      const lock = { mode: 'pessimistic_write' } // = SELECT ... FOR UPDATE

      // ① 課程存在嗎？同時鎖住課程這一列（鎖的順序固定：先課程、後使用者，避免死結）
      const course = await manager.findOne(Course, {
        where: { id: courseId },
        select: { id: true, max_participants: true },
        lock
      })
      if (!course) {
        throw new AppError(400, BOOKING_MESSAGES.COURSE_NOT_FOUND)
      }
      await manager.findOne(User, { where: { id: userId }, select: { id: true }, lock })

      // ② 對這堂課有過報名紀錄嗎？⚠️ 不排除已取消的：取消過的課不能再報名
      const hasBooked = await manager.existsBy(CourseBooking, {
        user_id: userId,
        course_id: courseId
      })
      if (hasBooked) {
        throw new AppError(400, BOOKING_MESSAGES.ALREADY_BOOKED)
      }

      // ③ 還有堂數嗎？沒買過方案也算 0 堂
      const { remain } = await getCreditSummary(manager, userId)
      if (remain <= 0) {
        throw new AppError(400, BOOKING_MESSAGES.NO_CREDIT)
      }

      // ④ 名額滿了嗎？只算「未取消」的報名
      const participants = await manager.countBy(CourseBooking, {
        course_id: courseId,
        cancelled_at: IsNull()
      })
      if (participants >= course.max_participants) {
        throw new AppError(400, BOOKING_MESSAGES.COURSE_FULL)
      }

      await manager.insert(CourseBooking, { user_id: userId, course_id: courseId })
    })
  } catch (err) {
    // 最後一道保險：UNIQUE (user_id, course_id) 擋下的重複報名
    if (isUniqueViolation(err)) {
      throw new AppError(400, BOOKING_MESSAGES.ALREADY_BOOKED)
    }
    throw err
  }
}

// 取消報名（軟刪除：紀錄保留，只標 cancelled_at）
async function cancelBooking(userId, courseId) {
  // 「找到尚未取消的報名」與「標記取消」是同一條 UPDATE：兩個請求同時取消，只會有一個成功
  // 堂數不用另外「加回去」：剩餘堂數是現算的，未取消的報名少一筆，堂數自然回來
  // cancelled_at: () => 'now()'：直接用資料庫的 now()，不是 JS 的時間
  const result = await dataSource
    .getRepository(CourseBooking)
    .update(
      { user_id: userId, course_id: courseId, cancelled_at: IsNull() },
      { cancelled_at: () => 'now()' }
    )
  // 課程不存在、從未報名、已經取消過：三種情況都回同一句
  if (result.affected === 0) {
    throw new AppError(400, BOOKING_MESSAGES.COURSE_NOT_FOUND)
  }
}

module.exports = { BOOKING_MESSAGES, listOngoingCourses, bookCourse, cancelBooking }
