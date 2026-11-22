// M1 / M5：購買方案的商業邏輯與資料存取
const dataSource = require('../db/data-source')
const CreditPackage = require('../entities/CreditPackage')
const CreditPurchase = require('../entities/CreditPurchase')
const { AppError, isUniqueViolation, isForeignKeyViolation } = require('../utils')

const packageRepo = dataSource.getRepository(CreditPackage)
const purchaseRepo = dataSource.getRepository(CreditPurchase)

// 方案列表
function listPackages() {
  return packageRepo.find({
    select: { id: true, name: true, credit_amount: true, price: true },
    order: { createdAt: 'ASC' }
  })
}

// 新增方案
async function createPackage({ name, creditAmount, price }) {
  try {
    return await packageRepo.save(packageRepo.create({ name, credit_amount: creditAmount, price }))
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppError(409, '資料重複')
    }
    throw err
  }
}

// 購買方案
async function purchasePackage(userId, creditPackageId) {
  const creditPackage = await packageRepo.findOneBy({ id: creditPackageId })
  if (!creditPackage) {
    throw new AppError(400, 'ID錯誤')
  }

  try {
    // 名稱、堂數、金額從方案複製成「購買當下的快照」，前端不能（也不需要）送金額
    await purchaseRepo.insert({
      user_id: userId,
      credit_package_id: creditPackage.id,
      name: creditPackage.name,
      purchased_credits: creditPackage.credit_amount,
      price_paid: creditPackage.price
    })
  } catch (err) {
    // 查到方案之後、寫入之前，方案剛好被刪掉：外鍵檢查失敗，當成方案不存在
    if (isForeignKeyViolation(err)) {
      throw new AppError(400, 'ID錯誤')
    }
    throw err
  }
}

// 刪除方案：回傳的 DeleteResult  { raw: [], affected }
async function deletePackage(creditPackageId) {
  const result = await packageRepo.delete(creditPackageId)
  if (result.affected === 0) {
    throw new AppError(400, 'ID錯誤')
  }
  return result
}

module.exports = { listPackages, createPackage, purchasePackage, deletePackage }
