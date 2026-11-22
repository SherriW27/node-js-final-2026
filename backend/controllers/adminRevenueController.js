// M6：教練月營收（只有教練本人能查自己的）
const revenueService = require('../services/revenueService')
const { AppError, success } = require('../utils')

// month= 收英文小寫月份名（不是數字、不是 YYYY-MM）；陣列位置 + 1 就是月份
const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
]

// GET /api/admin/coaches/revenue?month=june
async function getMonthly(req, res) {
  const { month } = req.query
  // 沒帶、大小寫不對（June）、數字（6）、日期（2026-06）、重複帶（會變陣列）都擋掉
  const monthIndex = typeof month === 'string' ? MONTH_NAMES.indexOf(month) : -1
  if (monthIndex === -1) {
    throw new AppError(400, '欄位未填寫正確')
  }
  success(res, await revenueService.getMonthlyRevenue(req.user.id, monthIndex))
}

module.exports = { getMonthly }
