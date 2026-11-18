// M1：購買方案管理（全部 public，不需登入）
const express = require('express')
const pool = require('../db')
const { isUuid, fail, success, isUniqueViolation, isNonNegativeInt } = require('../utils')

const router = express.Router()

// GET /api/credit-package：取得方案列表
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, credit_amount, price FROM credit_package ORDER BY created_at'
  )
  success(res, rows)
})

// POST /api/credit-package：新增方案
router.post('/', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const creditAmount = req.body?.credit_amount
  const price = req.body?.price

  if (!name || !isNonNegativeInt(creditAmount) || !isNonNegativeInt(price)) {
    return fail(res, 400, '欄位未填寫正確')
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO credit_package (name, credit_amount, price)
       VALUES ($1, $2, $3)
       RETURNING id, name, credit_amount, price, created_at AS "createdAt"`,
      [name, creditAmount, price]
    )
    success(res, rows[0])
  } catch (err) {
    if (isUniqueViolation(err)) {
      return fail(res, 409, '資料重複')
    }
    throw err
  }
})

// DELETE /api/credit-package/:creditPackageId：刪除方案
router.delete('/:creditPackageId', async (req, res) => {
  const { creditPackageId } = req.params
  if (!isUuid(creditPackageId)) {
    return fail(res, 400, 'ID錯誤')
  }

  const result = await pool.query('DELETE FROM credit_package WHERE id = $1', [creditPackageId])
  if (result.rowCount === 0) {
    return fail(res, 400, 'ID錯誤')
  }
  success(res, { raw: [], affected: result.rowCount })
})

module.exports = router
