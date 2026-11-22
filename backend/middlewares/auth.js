// 驗證登入：檢查 Authorization: Bearer <token>，通過後把使用者放進 req.user
const jwt = require('jsonwebtoken')
const dataSource = require('../db/data-source')
const User = require('../entities/User')
const { fail, isUuid } = require('../utils')

async function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ') || !header.slice(7).trim()) {
    return fail(res, 401, '請先登入')
  }
  const token = header.slice(7).trim()

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return fail(res, 401, 'Token 已過期')
    }
    return fail(res, 401, '無效的 token')
  }

  // token 簽章正確，但使用者可能已不存在，所以要再查一次資料庫
  if (!isUuid(payload.id)) {
    return fail(res, 401, '無效的 token')
  }
  // password 在 entity 設了 select: false，修改密碼要比對舊密碼，所以這裡明確選出來
  const user = await dataSource.getRepository(User).findOne({
    where: { id: payload.id },
    select: { id: true, name: true, email: true, password: true, role: true }
  })
  if (!user) {
    return fail(res, 401, '無效的 token')
  }

  req.user = user
  next()
}

module.exports = auth
