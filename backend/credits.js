// 堂數計算：沒有「餘額」欄位，每次都用公式現算（只有一份資料來源，不會對不上）
//   剩餘堂數 = 所有購買的堂數加總 − 未取消的報名數
//   已使用堂數 = 未取消的報名數
// db 可以是連線池，也可以是交易中的 client（報名時要在同一個交易裡算）
async function getCreditSummary(db, userId) {
  const { rows } = await db.query(
    `SELECT (SELECT COALESCE(SUM(purchased_credits), 0)::int
               FROM credit_purchase WHERE user_id = $1) AS total,
            (SELECT COUNT(*)::int
               FROM course_booking WHERE user_id = $1 AND cancelled_at IS NULL) AS used`,
    [userId]
  )
  const { total, used } = rows[0]
  return { total, used, remain: total - used }
}

module.exports = { getCreditSummary }
