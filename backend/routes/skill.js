// M1：技能管理（全部 public，不需登入）
const express = require('express')
const pool = require('../db')
const { isUuid, fail, success, isUniqueViolation, isForeignKeyViolation } = require('../utils')

const router = express.Router()

// GET /api/coaches/skill：取得技能列表
router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT id, name FROM skill ORDER BY created_at')
  success(res, rows)
})

// POST /api/coaches/skill：新增技能
router.post('/', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  if (!name) {
    return fail(res, 400, '欄位未填寫正確')
  }

  try {
    const { rows } = await pool.query(
      'INSERT INTO skill (name) VALUES ($1) RETURNING id, name, created_at AS "createdAt"',
      [name]
    )
    success(res, rows[0])
  } catch (err) {
    if (isUniqueViolation(err)) {
      return fail(res, 409, '資料重複')
    }
    throw err
  }
})

// DELETE /api/coaches/skill/:skillId：刪除技能
router.delete('/:skillId', async (req, res) => {
  const { skillId } = req.params
  if (!isUuid(skillId)) {
    return fail(res, 400, 'ID錯誤')
  }

  try {
    const result = await pool.query('DELETE FROM skill WHERE id = $1', [skillId])
    if (result.rowCount === 0) {
      return fail(res, 400, 'ID錯誤')
    }
    success(res, { raw: [], affected: result.rowCount })
  } catch (err) {
    // 技能已被課程使用，資料庫的外鍵限制不讓刪：回清楚的 409，不要變成 500
    if (isForeignKeyViolation(err)) {
      return fail(res, 409, '此技能已被課程使用，無法刪除')
    }
    throw err
  }
})

module.exports = router
