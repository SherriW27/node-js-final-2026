// M1：技能管理（全部 public，不需登入）
const skillService = require('../services/skillService')
const { AppError, isUuid, success } = require('../utils')

// GET /api/coaches/skill：取得技能列表
async function list(req, res) {
  success(res, await skillService.listSkills())
}

// POST /api/coaches/skill：新增技能
async function create(req, res) {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  if (!name) {
    throw new AppError(400, '欄位未填寫正確')
  }
  success(res, await skillService.createSkill(name))
}

// DELETE /api/coaches/skill/:skillId：刪除技能
async function remove(req, res) {
  const { skillId } = req.params
  if (!isUuid(skillId)) {
    throw new AppError(400, 'ID錯誤')
  }
  success(res, await skillService.deleteSkill(skillId))
}

module.exports = { list, create, remove }
