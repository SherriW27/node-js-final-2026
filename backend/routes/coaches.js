// M4：教練的公開瀏覽（全部免登入）
const express = require('express')
const pool = require('../db')
const PUBLIC_COURSE_SELECT = require('../publicCourseSelect')
const { isUuid, fail, success } = require('../utils')

const router = express.Router()

// 查詢參數一律是字串，只接受 1~9 位數字（也避免超大數字讓 (page-1)*per 溢位變成 500）
const QUERY_NUMBER_REGEX = /^\d{1,9}$/

// 用「教練 id」查教練詳情；查不到回 undefined
async function findCoachDetail(coachId) {
  const { rows } = await pool.query(
    `SELECT u.name, u.role,
            c.id, c.user_id, c.experience_years, c.description, c.profile_image_url,
            c.created_at, c.updated_at,
            COALESCE(array_agg(s.name ORDER BY s.name) FILTER (WHERE s.name IS NOT NULL), '{}') AS skills
       FROM coach c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN coach_link_skill l ON l.coach_id = c.id
       LEFT JOIN skill s ON s.id = l.skill_id
      WHERE c.id = $1
      GROUP BY c.id, u.id`,
    [coachId]
  )
  return rows[0]
}

// GET /api/coaches?per=&page=：教練分頁列表
router.get('/', async (req, res) => {
  const { per, page } = req.query
  // per、page 必填；同名參數重複出現時會變成陣列，不是字串，也一併擋掉
  if (
    typeof per !== 'string' ||
    typeof page !== 'string' ||
    !QUERY_NUMBER_REGEX.test(per) ||
    !QUERY_NUMBER_REGEX.test(page)
  ) {
    return fail(res, 400, '欄位未填寫正確')
  }

  const limit = Number(per)
  // 頁碼從 1 開始：跳過前 (page-1) 頁；page=0 當成第 1 頁，避免 OFFSET 變負數
  const offset = Math.max(Number(page) - 1, 0) * limit

  // 排序要穩定：最新升級的排前面，created_at 相同時再用 id 破平手，否則分頁可能重複或漏資料
  const { rows } = await pool.query(
    `SELECT c.id, c.user_id, u.name
       FROM coach c
       JOIN users u ON u.id = c.user_id
      ORDER BY c.created_at DESC, c.id
      LIMIT $1 OFFSET $2`,
    [limit, offset]
  )
  success(res, rows)
})

// GET /api/coaches/:coachId：教練詳情（coachId 是「教練 id」，不是 user_id）
router.get('/:coachId', async (req, res) => {
  const { coachId } = req.params
  if (!isUuid(coachId)) {
    return fail(res, 400, '欄位未填寫正確')
  }

  const detail = await findCoachDetail(coachId)
  if (!detail) {
    return fail(res, 400, '找不到該教練')
  }

  // 公開 API：只回名字與角色，不回 email 等個資
  const { name, role, ...coach } = detail
  success(res, { user: { name, role }, coach })
})

// GET /api/coaches/:coachId/courses：這位教練「未結束」的課（end_at > now，含尚未開始）
router.get('/:coachId/courses', async (req, res) => {
  const { coachId } = req.params
  if (!isUuid(coachId)) {
    return fail(res, 400, '欄位未填寫正確')
  }

  const coachResult = await pool.query('SELECT user_id FROM coach WHERE id = $1', [coachId])
  if (coachResult.rows.length === 0) {
    return fail(res, 400, '找不到該教練')
  }

  const { rows } = await pool.query(
    `${PUBLIC_COURSE_SELECT}
      WHERE c.user_id = $1 AND c.end_at > now()
      ORDER BY c.start_at, c.id`,
    [coachResult.rows[0].user_id]
  )
  success(res, rows)
})

module.exports = router
