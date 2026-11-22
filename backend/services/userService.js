// M2：會員系統的商業邏輯與資料存取（註冊、登入、個人資料、密碼、購買紀錄、課表）
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const dataSource = require('../db/data-source')
const User = require('../entities/User')
const CreditPurchase = require('../entities/CreditPurchase')
const CourseBooking = require('../entities/CourseBooking')
const { getCreditSummary } = require('./creditSummary')
const { AppError, isUniqueViolation } = require('../utils')

const userRepo = dataSource.getRepository(User)

const SALT_ROUNDS = 10

// 註冊：email 已正規化（trim + 小寫）由 controller 傳進來
async function signup({ name, email, password }) {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
  try {
    const user = await userRepo.save(userRepo.create({ name, email, password: hashedPassword }))
    return { id: user.id, name: user.name }
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppError(409, 'Email 已被使用')
    }
    throw err
  }
}

// 登入：比對密碼並簽發 JWT
async function login({ email, password }) {
  // password 是 select: false，要比對密碼就得明確選出來
  const user = await userRepo.findOne({
    where: { email },
    select: { id: true, name: true, password: true, role: true }
  })
  // 「帳號不存在」與「密碼錯誤」共用同一句，不透露這個 Email 有沒有註冊過
  const isPasswordCorrect = user ? await bcrypt.compare(password, user.password) : false
  if (!isPasswordCorrect) {
    throw new AppError(400, '使用者不存在或密碼輸入錯誤')
  }

  // payload 必須有 id、role；exp 由 expiresIn 自動加上
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_DAY || '30d'
  })
  return { token, user: { name: user.name } }
}

// 更新暱稱：user 是 auth middleware 查出來的登入者
async function updateName(user, newName) {
  if (newName === user.name) {
    throw new AppError(400, '使用者名稱未變更')
  }
  // update() 不會先查出整筆資料，直接下 UPDATE；updated_at 由 updateDate 自動刷新
  const result = await userRepo.update(user.id, { name: newName })
  if (result.affected === 0) {
    throw new AppError(400, '更新使用者資料失敗')
  }
  return { name: newName }
}

// 修改密碼：格式類的檢查由 controller 做完，這裡只做要查資料的「舊密碼比對」
async function changePassword(user, oldPassword, newPassword) {
  const isOldPasswordCorrect = await bcrypt.compare(oldPassword, user.password)
  if (!isOldPasswordCorrect) {
    throw new AppError(400, '密碼輸入錯誤')
  }
  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS)
  await userRepo.update(user.id, { password: hashedPassword })
}

// 本人的購買紀錄（新到舊）
function listPurchases(userId) {
  return dataSource.getRepository(CreditPurchase).find({
    select: { name: true, purchased_credits: true, price_paid: true, purchase_at: true },
    where: { user_id: userId },
    order: { purchase_at: 'DESC', id: 'ASC' }
  })
}

// 本人的課表與剩餘堂數
async function getMyCourses(userId) {
  const { used, remain } = await getCreditSummary(dataSource.manager, userId)

  // course_booking 包含「已取消」的報名（cancelled_at 有值），前端靠它顯示狀態，不能自己濾掉
  // 回傳欄位要攤平（course_id、coach_name…），用 QueryBuilder 自己挑欄位並取別名
  const bookings = await dataSource
    .getRepository(CourseBooking)
    .createQueryBuilder('b')
    .innerJoin('b.course', 'c')
    .innerJoin('c.user', 'u')
    .select('c.id', 'course_id')
    .addSelect('c.name', 'name')
    .addSelect('c.start_at', 'start_at')
    .addSelect('c.end_at', 'end_at')
    .addSelect('c.meeting_url', 'meeting_url')
    .addSelect('u.name', 'coach_name')
    .addSelect('b.cancelled_at', 'cancelled_at')
    .where('b.user_id = :userId', { userId })
    .orderBy('c.start_at', 'ASC')
    .addOrderBy('c.id', 'ASC')
    .getRawMany()
  return { credit_remain: remain, credit_usage: used, course_booking: bookings }
}

module.exports = { signup, login, updateName, changePassword, listPurchases, getMyCourses }
