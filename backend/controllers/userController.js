// M2：會員系統（註冊、登入、個人資料、修改密碼）；M5：購買紀錄、課表
const userService = require('../services/userService')
const {
  AppError,
  success,
  isValidPassword,
  isFilledString,
  PASSWORD_RULE_MESSAGE
} = require('../utils')

const NAME_MAX_LENGTH = 50

// 名稱：必填、去掉前後空白後不可為空，且不能超過資料表欄位長度
const isValidName = (value) => isFilledString(value) && value.trim().length <= NAME_MAX_LENGTH

const normalizeEmail = (email) => email.trim().toLowerCase()

// POST /api/users/signup：註冊
async function signup(req, res) {
  const { name, email, password } = req.body ?? {}

  if (!isValidName(name) || !isFilledString(email) || !isFilledString(password)) {
    throw new AppError(400, '欄位未填寫正確')
  }
  if (!isValidPassword(password)) {
    throw new AppError(400, PASSWORD_RULE_MESSAGE)
  }

  const user = await userService.signup({
    name: name.trim(),
    email: normalizeEmail(email),
    password
  })
  success(res, { user }, 201)
}

// POST /api/users/login：登入，簽發 JWT
async function login(req, res) {
  const { email, password } = req.body ?? {}

  if (!isFilledString(email) || !isFilledString(password)) {
    throw new AppError(400, '欄位未填寫正確')
  }
  // 密碼格式根本不對時，不用去查資料庫
  if (!isValidPassword(password)) {
    throw new AppError(400, PASSWORD_RULE_MESSAGE)
  }

  success(res, await userService.login({ email: normalizeEmail(email), password }), 201)
}

// GET /api/users/profile：取得本人資料（auth 已經查好了，不用再進 service）
function getProfile(req, res) {
  const { name, email } = req.user
  success(res, { user: { name, email } })
}

// PUT /api/users/profile：更新暱稱
async function updateProfile(req, res) {
  const { name } = req.body ?? {}
  if (!isValidName(name)) {
    throw new AppError(400, '欄位未填寫正確')
  }
  const user = await userService.updateName(req.user, name.trim())
  success(res, { user })
}

// PUT /api/users/password：修改密碼（檢查順序依文件，踩到哪條就回哪條）
async function changePassword(req, res) {
  const { password, new_password: newPassword, confirm_new_password: confirmNewPassword } =
    req.body ?? {}

  // 1. 三欄任一缺漏或為空
  if (!isFilledString(password) || !isFilledString(newPassword) || !isFilledString(confirmNewPassword)) {
    throw new AppError(400, '欄位未填寫正確')
  }
  // 2. 三欄都要符合密碼規則（舊密碼也要）
  if (![password, newPassword, confirmNewPassword].every(isValidPassword)) {
    throw new AppError(400, PASSWORD_RULE_MESSAGE)
  }
  // 3. 新舊密碼相同
  if (newPassword === password) {
    throw new AppError(400, '新密碼不能與舊密碼相同')
  }
  // 4. 新密碼與確認不一致
  if (newPassword !== confirmNewPassword) {
    throw new AppError(400, '新密碼與驗證新密碼不一致')
  }
  // 5. 舊密碼比對錯誤（要查資料，交給 service）
  await userService.changePassword(req.user, password, newPassword)
  success(res, null)
}

// GET /api/users/credit-package：本人的購買紀錄（新到舊，data 直接是陣列）
async function listPurchases(req, res) {
  success(res, await userService.listPurchases(req.user.id))
}

// GET /api/users/courses：本人的課表與剩餘堂數
async function listMyCourses(req, res) {
  success(res, await userService.getMyCourses(req.user.id))
}

module.exports = {
  signup,
  login,
  getProfile,
  updateProfile,
  changePassword,
  listPurchases,
  listMyCourses
}
