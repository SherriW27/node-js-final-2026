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

module.exports = { isUuid, fail, success, isUniqueViolation }
