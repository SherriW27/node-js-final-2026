// 共用小工具

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// 檢查是不是 uuid 格式（避免亂打的 id 直接丟進資料庫變成 500）
const isUuid = (value) => typeof value === 'string' && UUID_REGEX.test(value)

// 統一的失敗回應格式：{ status: 'failed', message }
const fail = (res, code, message) => res.status(code).json({ status: 'failed', message })

// 統一的成功回應格式：{ status: 'success', data }
const success = (res, data, code = 200) => res.status(code).json({ status: 'success', data })

// PostgreSQL 違反 UNIQUE 限制時的錯誤碼
const isUniqueViolation = (err) => err && err.code === '23505'

// 密碼規則：要有小寫、大寫、數字，整串 8~16 個非空白字元
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S{8,16}$/
const isValidPassword = (value) => typeof value === 'string' && PASSWORD_REGEX.test(value)

// 必填的字串欄位：必須是字串，且去掉前後空白後不是空的
const isFilledString = (value) => typeof value === 'string' && value.trim() !== ''

const PASSWORD_RULE_MESSAGE = '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'

module.exports = {
  isUuid,
  fail,
  success,
  isUniqueViolation,
  isValidPassword,
  isFilledString,
  PASSWORD_RULE_MESSAGE
}
