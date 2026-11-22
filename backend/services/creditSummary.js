// 堂數計算：沒有「餘額」欄位，每次都用公式現算（只有一份資料來源，不會對不上）
//   剩餘堂數 = 所有購買的堂數加總 − 未取消的報名數
//   已使用堂數 = 未取消的報名數
const { IsNull } = require('typeorm')
const CreditPurchase = require('../entities/CreditPurchase')
const CourseBooking = require('../entities/CourseBooking')

// manager 可以是 dataSource.manager，也可以是交易中的 manager（報名時要在同一個交易裡算）
async function getCreditSummary(manager, userId) {
  // sum() 在沒有任何購買紀錄時回 null，當成 0 堂
  const total = (await manager.sum(CreditPurchase, 'purchased_credits', { user_id: userId })) ?? 0
  // IsNull()：產生 cancelled_at IS NULL（直接寫 null 不會被當成條件）
  const used = await manager.countBy(CourseBooking, { user_id: userId, cancelled_at: IsNull() })
  return { total, used, remain: total - used }
}

module.exports = { getCreditSummary }
