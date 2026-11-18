// M2：會員系統（註冊、登入、個人資料、修改密碼）
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../db')
const auth = require('../middlewares/auth')
const {
  fail,
  success,
  isUniqueViolation,
  isValidPassword,
  isFilledString,
  PASSWORD_RULE_MESSAGE
} = require('../utils')

const router = express.Router()

const SALT_ROUNDS = 10
const NAME_MAX_LENGTH = 50

// 名稱：必填、去掉前後空白後不可為空，且不能超過資料表欄位長度
const isValidName = (value) => isFilledString(value) && value.trim().length <= NAME_MAX_LENGTH

// POST /api/users/signup：註冊
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body ?? {}

  if (!isValidName(name) || !isFilledString(email) || !isFilledString(password)) {
    return fail(res, 400, '欄位未填寫正確')
  }
  if (!isValidPassword(password)) {
    return fail(res, 400, PASSWORD_RULE_MESSAGE)
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name',
      [name.trim(), email.trim().toLowerCase(), hashedPassword]
    )
    success(res, { user: rows[0] }, 201)
  } catch (err) {
    if (isUniqueViolation(err)) {
      return fail(res, 409, 'Email 已被使用')
    }
    throw err
  }
})

// POST /api/users/login：登入，簽發 JWT
router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {}

  if (!isFilledString(email) || !isFilledString(password)) {
    return fail(res, 400, '欄位未填寫正確')
  }
  // 密碼格式根本不對時，不用去查資料庫
  if (!isValidPassword(password)) {
    return fail(res, 400, PASSWORD_RULE_MESSAGE)
  }

  const { rows } = await pool.query(
    'SELECT id, name, password, role FROM users WHERE email = $1',
    [email.trim().toLowerCase()]
  )
  const user = rows[0]
  // 「帳號不存在」與「密碼錯誤」共用同一句，不透露這個 Email 有沒有註冊過
  const isPasswordCorrect = user ? await bcrypt.compare(password, user.password) : false
  if (!isPasswordCorrect) {
    return fail(res, 400, '使用者不存在或密碼輸入錯誤')
  }

  // payload 必須有 id、role；exp 由 expiresIn 自動加上
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_DAY || '30d'
  })
  success(res, { token, user: { name: user.name } }, 201)
})

// GET /api/users/profile：取得本人資料
router.get('/profile', auth, (req, res) => {
  const { name, email } = req.user
  success(res, { user: { name, email } })
})

// PUT /api/users/profile：更新暱稱
router.put('/profile', auth, async (req, res) => {
  const { name } = req.body ?? {}
  if (!isValidName(name)) {
    return fail(res, 400, '欄位未填寫正確')
  }

  const newName = name.trim()
  if (newName === req.user.name) {
    return fail(res, 400, '使用者名稱未變更')
  }

  const result = await pool.query('UPDATE users SET name = $1, updated_at = now() WHERE id = $2', [
    newName,
    req.user.id
  ])
  if (result.rowCount === 0) {
    return fail(res, 400, '更新使用者資料失敗')
  }
  success(res, { user: { name: newName } })
})

// PUT /api/users/password：修改密碼（檢查順序依文件，踩到哪條就回哪條）
router.put('/password', auth, async (req, res) => {
  const { password, new_password: newPassword, confirm_new_password: confirmNewPassword } =
    req.body ?? {}

  // 1. 三欄任一缺漏或為空
  if (!isFilledString(password) || !isFilledString(newPassword) || !isFilledString(confirmNewPassword)) {
    return fail(res, 400, '欄位未填寫正確')
  }
  // 2. 三欄都要符合密碼規則（舊密碼也要）
  if (![password, newPassword, confirmNewPassword].every(isValidPassword)) {
    return fail(res, 400, PASSWORD_RULE_MESSAGE)
  }
  // 3. 新舊密碼相同
  if (newPassword === password) {
    return fail(res, 400, '新密碼不能與舊密碼相同')
  }
  // 4. 新密碼與確認不一致
  if (newPassword !== confirmNewPassword) {
    return fail(res, 400, '新密碼與驗證新密碼不一致')
  }
  // 5. 舊密碼比對錯誤
  const isOldPasswordCorrect = await bcrypt.compare(password, req.user.password)
  if (!isOldPasswordCorrect) {
    return fail(res, 400, '密碼輸入錯誤')
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS)
  await pool.query('UPDATE users SET password = $1, updated_at = now() WHERE id = $2', [
    hashedPassword,
    req.user.id
  ])
  success(res, null)
})

module.exports = router
