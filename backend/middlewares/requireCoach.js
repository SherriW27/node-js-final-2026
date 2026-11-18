// 檢查登入者是不是教練。必須放在 auth 之後（要靠 auth 放進來的 req.user）
const { fail } = require('../utils')

function requireCoach(req, res, next) {
  // 注意：role 是 auth 從資料庫查出來的，不是讀 token，所以剛升級的人不用重登入也算教練
  if (req.user.role !== 'COACH') {
    return fail(res, 401, '使用者尚未成為教練')
  }
  next()
}

module.exports = requireCoach
