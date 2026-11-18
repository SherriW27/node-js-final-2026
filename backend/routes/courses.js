// 全站課程：M4 進行中課程列表、M5 報名與取消報名
const express = require('express')
const pool = require('../db')
const withTransaction = require('../withTransaction')
const auth = require('../middlewares/auth')
const PUBLIC_COURSE_SELECT = require('../publicCourseSelect')
const { getCreditSummary } = require('../credits')
const { isUuid, fail, success, isUniqueViolation } = require('../utils')

const router = express.Router()

// ⚠️ 報名失敗的固定訊息：前端用「逐字比對」決定開哪個提示視窗，多一個字、少一個標點都會壞
// （第四句「請先登入」由 auth middleware 負責）
const MSG_COURSE_NOT_FOUND = 'ID錯誤'
const MSG_ALREADY_BOOKED = '已經報名過此課程'
const MSG_NO_CREDIT = '已無可使用堂數'
const MSG_COURSE_FULL = '已達最大參加人數，無法參加'

// GET /api/courses：全站「進行中」的課程（start_at <= now < end_at）
// 尚未開始與已結束的都不回；跟教練課表（end_at > now）是不同的條件
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `${PUBLIC_COURSE_SELECT}
      WHERE c.start_at <= now() AND now() < c.end_at
      ORDER BY c.start_at, c.id`
  )
  success(res, rows)
})

// POST /api/courses/:courseId：報名課程（需登入，不需要 body）
router.post('/:courseId', auth, async (req, res) => {
  const { courseId } = req.params
  if (!isUuid(courseId)) {
    return fail(res, 400, MSG_COURSE_NOT_FOUND)
  }

  try {
    // 整個流程包在一個交易裡，並先「鎖列」讓同一堂課、同一個人的報名排隊執行：
    // 沒有鎖的話，兩個人同時搶最後一個名額、或一個人同時報兩堂課搶最後一堂，
    // 都會在「檢查通過」之後才各自寫入，造成超收或餘額變負
    const errorMessage = await withTransaction(async (client) => {
      // ① 課程存在嗎？同時鎖住課程這一列（鎖的順序固定：先課程、後使用者，避免死結）
      const courseResult = await client.query(
        'SELECT max_participants FROM course WHERE id = $1 FOR UPDATE',
        [courseId]
      )
      if (courseResult.rows.length === 0) {
        return MSG_COURSE_NOT_FOUND
      }
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.user.id])

      // ② 對這堂課有過報名紀錄嗎？⚠️ 不排除已取消的：取消過的課不能再報名
      const existed = await client.query(
        'SELECT 1 FROM course_booking WHERE user_id = $1 AND course_id = $2',
        [req.user.id, courseId]
      )
      if (existed.rows.length > 0) {
        return MSG_ALREADY_BOOKED
      }

      // ③ 還有堂數嗎？沒買過方案也算 0 堂
      const { remain } = await getCreditSummary(client, req.user.id)
      if (remain <= 0) {
        return MSG_NO_CREDIT
      }

      // ④ 名額滿了嗎？只算「未取消」的報名
      const countResult = await client.query(
        'SELECT COUNT(*)::int AS count FROM course_booking WHERE course_id = $1 AND cancelled_at IS NULL',
        [courseId]
      )
      if (countResult.rows[0].count >= courseResult.rows[0].max_participants) {
        return MSG_COURSE_FULL
      }

      await client.query('INSERT INTO course_booking (user_id, course_id) VALUES ($1, $2)', [
        req.user.id,
        courseId
      ])
      return null
    })

    if (errorMessage) {
      return fail(res, 400, errorMessage)
    }
    success(res, null, 201)
  } catch (err) {
    // 最後一道保險：UNIQUE (user_id, course_id) 擋下的重複報名
    if (isUniqueViolation(err)) {
      return fail(res, 400, MSG_ALREADY_BOOKED)
    }
    throw err
  }
})

// DELETE /api/courses/:courseId：取消報名（軟刪除：紀錄保留，只標 cancelled_at）
router.delete('/:courseId', auth, async (req, res) => {
  const { courseId } = req.params
  if (!isUuid(courseId)) {
    return fail(res, 400, MSG_COURSE_NOT_FOUND)
  }

  // 「找到尚未取消的報名」與「標記取消」是同一條 SQL：兩個請求同時取消，只會有一個成功
  // 堂數不用另外「加回去」：剩餘堂數是現算的，未取消的報名少一筆，堂數自然回來
  const result = await pool.query(
    `UPDATE course_booking SET cancelled_at = now()
      WHERE user_id = $1 AND course_id = $2 AND cancelled_at IS NULL`,
    [req.user.id, courseId]
  )
  // 課程不存在、從未報名、已經取消過：三種情況都回同一句
  if (result.rowCount === 0) {
    return fail(res, 400, MSG_COURSE_NOT_FOUND)
  }
  success(res, null)
})

module.exports = router
