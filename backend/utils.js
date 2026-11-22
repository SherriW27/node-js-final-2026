// 共用小工具

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// 檢查是不是 uuid 格式（避免亂打的 id 直接丟進資料庫變成 500）
const isUuid = (value) => typeof value === 'string' && UUID_REGEX.test(value)

// 統一的失敗回應格式：{ status: 'failed', message }
const fail = (res, code, message) => res.status(code).json({ status: 'failed', message })

// 統一的成功回應格式：{ status: 'success', data }
const success = (res, data, code = 200) => res.status(code).json({ status: 'success', data })

// TypeORM 會把資料庫錯誤包成 QueryFailedError，PostgreSQL 原本的錯誤放在 driverError 裡
const pgErrorCode = (err) => err?.driverError?.code

// PostgreSQL 違反 UNIQUE 限制時的錯誤碼
const isUniqueViolation = (err) => pgErrorCode(err) === '23505'

// 密碼規則：要有小寫、大寫、數字，整串 8~16 個非空白字元
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S{8,16}$/
const isValidPassword = (value) => typeof value === 'string' && PASSWORD_REGEX.test(value)

// 必填的字串欄位：必須是字串，且去掉前後空白後不是空的
const isFilledString = (value) => typeof value === 'string' && value.trim() !== ''

// 0 以上的整數，且必須是 number 型別（字串 "10" 不算）
const isNonNegativeInt = (value) => Number.isInteger(value) && value >= 0

// 網址必須以 https:// 開頭
const isHttpsUrl = (value) => typeof value === 'string' && /^https:\/\/\S+$/i.test(value)

// UTC ISO 8601 時間字串，例如 2026-08-20T10:00:00Z（也接受 +08:00 這種帶時區的寫法）
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/
const isIsoDateString = (value) =>
  typeof value === 'string' && ISO_DATE_REGEX.test(value) && !Number.isNaN(Date.parse(value))

// PostgreSQL 外鍵檢查失敗（例如 skill_id 指向不存在的技能，或要刪除被使用中的資料）
const isForeignKeyViolation = (err) => pgErrorCode(err) === '23503'

const PASSWORD_RULE_MESSAGE = '密碼不符合規則，需要包含英文數字大小寫，最短8個字，最長16個字'

// 「預期中」的失敗（欄位錯誤、找不到資料、名額已滿…）：controller 和 service 直接 throw，
// 由 app.js 的全域錯誤處理統一轉成 { status: 'failed', message } 回應。
// 沒有包成 AppError 的錯誤才是真正的意外，一律回 500
class AppError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
  }
}

module.exports = {
  AppError,
  isUuid,
  fail,
  success,
  isUniqueViolation,
  isValidPassword,
  isFilledString,
  isNonNegativeInt,
  isHttpsUrl,
  isIsoDateString,
  isForeignKeyViolation,
  PASSWORD_RULE_MESSAGE
}
