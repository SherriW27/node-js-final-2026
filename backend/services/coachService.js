// M4：教練公開瀏覽的資料存取
const dataSource = require('../db/data-source')
const Coach = require('../entities/Coach')
const createPublicCourseQuery = require('./publicCourseQuery')
const { AppError } = require('../utils')

const coachRepo = dataSource.getRepository(Coach)

const COACH_NOT_FOUND = '找不到該教練'

// 教練分頁列表：limit = 每頁筆數，page 從 1 開始
async function listCoaches(limit, page) {
  // ⚠️ TypeORM 把 limit(0) 當成「沒設定上限」，會回傳全部資料，所以 per=0 要自己處理
  if (limit === 0) {
    return []
  }
  // 跳過前 (page-1) 頁；page=0 當成第 1 頁，避免 OFFSET 變負數
  const offset = Math.max(page - 1, 0) * limit

  // 排序要穩定：最新升級的排前面，created_at 相同時再用 id 破平手，否則分頁可能重複或漏資料
  return coachRepo
    .createQueryBuilder('c')
    .innerJoin('c.user', 'u')
    .select('c.id', 'id')
    .addSelect('c.user_id', 'user_id')
    .addSelect('u.name', 'name')
    .orderBy('c.created_at', 'DESC')
    .addOrderBy('c.id', 'ASC')
    .limit(limit)
    .offset(offset)
    .getRawMany()
}

// 教練詳情（coachId 是「教練 id」，不是 user_id）
async function getCoachDetail(coachId) {
  const coach = await coachRepo.findOne({
    where: { id: coachId },
    relations: { user: true, skills: true },
    order: { skills: { name: 'ASC' } }
  })
  if (!coach) {
    throw new AppError(400, COACH_NOT_FOUND)
  }

  // 公開 API：只回名字與角色，不回 email 等個資；技能只回名稱
  const { user, skills, ...coachFields } = coach
  return {
    user: { name: user.name, role: user.role },
    coach: { ...coachFields, skills: skills.map((skill) => skill.name) }
  }
}

// 這位教練「未結束」的課（end_at > now，含尚未開始）
async function listCoachUpcomingCourses(coachId) {
  const coach = await coachRepo.findOne({ where: { id: coachId }, select: { user_id: true } })
  if (!coach) {
    throw new AppError(400, COACH_NOT_FOUND)
  }

  return createPublicCourseQuery()
    .where('c.user_id = :userId', { userId: coach.user_id })
    .andWhere('c.end_at > now()')
    .orderBy('c.start_at', 'ASC')
    .addOrderBy('c.id', 'ASC')
    .getRawMany()
}

module.exports = { listCoaches, getCoachDetail, listCoachUpcomingCourses }
