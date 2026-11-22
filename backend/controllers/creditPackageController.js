// M1：購買方案管理（新增、列表、刪除為 public）；M5：購買方案（需登入）
const creditPackageService = require('../services/creditPackageService')
const { AppError, isUuid, success, isNonNegativeInt } = require('../utils')

// GET /api/credit-package：取得方案列表
async function list(req, res) {
  success(res, await creditPackageService.listPackages())
}

// POST /api/credit-package：新增方案
async function create(req, res) {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const creditAmount = req.body?.credit_amount
  const price = req.body?.price

  if (!name || !isNonNegativeInt(creditAmount) || !isNonNegativeInt(price)) {
    throw new AppError(400, '欄位未填寫正確')
  }
  success(res, await creditPackageService.createPackage({ name, creditAmount, price }))
}

// POST /api/credit-package/:creditPackageId：購買方案（M5，需登入，body 留空）
async function purchase(req, res) {
  const { creditPackageId } = req.params
  if (!isUuid(creditPackageId)) {
    throw new AppError(400, 'ID錯誤')
  }
  await creditPackageService.purchasePackage(req.user.id, creditPackageId)
  success(res, null)
}

// DELETE /api/credit-package/:creditPackageId：刪除方案
async function remove(req, res) {
  const { creditPackageId } = req.params
  if (!isUuid(creditPackageId)) {
    throw new AppError(400, 'ID錯誤')
  }
  success(res, await creditPackageService.deletePackage(creditPackageId))
}

module.exports = { list, create, purchase, remove }
