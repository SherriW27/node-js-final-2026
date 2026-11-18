// M6：教練月營收（只有教練本人能查自己的）
const express = require('express')
const pool = require('../db')
const auth = require('../middlewares/auth')
const requireCoach = require('../middlewares/requireCoach')
const { fail, success } = require('../utils')

const router = express.Router()

// ?month= 收英文小寫月份名（不是數字、不是 YYYY-MM）；陣列位置 + 1 就是月份
const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
]

// GET /api/admin/coaches/revenue?month=june
router.get('/', auth, requireCoach, async (req, res) => {
  const { month } = req.query
  // 沒帶、大小寫不對（June）、數字（6）、日期（2026-06）、重複帶（會變陣列）都擋掉
  const monthIndex = typeof month === 'string' ? MONTH_NAMES.indexOf(month) : -1
  if (monthIndex === -1) {
    return fail(res, 400, '欄位未填寫正確')
  }

  // 年份固定是伺服器「當年」；月份範圍用伺服器本機時間算，與測試取「當月」的口徑一致
  // 範圍是「左閉右開」：>= 當月 1 日 00:00 且 < 下月 1 日 00:00（monthIndex + 1 = 12 時會自動進位到隔年 1 月）
  const year = new Date().getFullYear()
  const start = new Date(year, monthIndex, 1)
  const end = new Date(year, monthIndex + 1, 1)

  const [bookingResult, packageResult] = await Promise.all([
    // ① 算進哪個月看「報名建立時間」（b.created_at），不是上課時間；已取消的不計
    //    participants：不重複的學員（同一人報多堂只算 1 人）
    //    bookings：未取消的報名「筆數」，也就是 API 的 course_count（欄位名有誤導性）
    pool.query(
      `SELECT COUNT(*)::int AS bookings, COUNT(DISTINCT b.user_id)::int AS participants
         FROM course_booking b
         JOIN course c ON c.id = b.course_id
        WHERE c.user_id = $1
          AND b.cancelled_at IS NULL
          AND b.created_at >= $2
          AND b.created_at < $3`,
      [req.user.id, start, end]
    ),
    // ② 單堂均價用「全部」方案一起算：Σprice ÷ Σcredit_amount
    pool.query(
      `SELECT COALESCE(SUM(price), 0) AS total_price,
              COALESCE(SUM(credit_amount), 0) AS total_credits
         FROM credit_package`
    )
  ])

  const { bookings, participants } = bookingResult.rows[0]
  const totalPrice = BigInt(packageResult.rows[0].total_price)
  const totalCredits = BigInt(packageResult.rows[0].total_credits)

  // revenue = floor(報名數 × 總價 ÷ 總堂數)，floor 在「乘完之後」才做
  // 用 BigInt 做整數運算：不先算出浮點數的均價，就不會有 999.9999 被捨去成 999 的誤差；
  // 整數相除本身就是無條件捨去（數字都是正的）。沒有任何方案時分母是 0，營收當 0
  const revenue = totalCredits === 0n ? 0 : Number((BigInt(bookings) * totalPrice) / totalCredits)

  success(res, { total: { revenue, participants, course_count: bookings } })
})

module.exports = router
