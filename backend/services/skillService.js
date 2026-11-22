// M1：技能管理的商業邏輯與資料存取
const dataSource = require('../db/data-source')
const Skill = require('../entities/Skill')
const { AppError, isUniqueViolation, isForeignKeyViolation } = require('../utils')

const skillRepo = dataSource.getRepository(Skill)

// 技能列表
function listSkills() {
  return skillRepo.find({
    select: { id: true, name: true },
    order: { createdAt: 'ASC' }
  })
}

// 新增技能
async function createSkill(name) {
  try {
    // create() 只是建立物件，save() 才真的寫進資料庫；寫入後 id、createdAt 會被填回物件上
    return await skillRepo.save(skillRepo.create({ name }))
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppError(409, '資料重複')
    }
    throw err
  }
}

// 刪除技能：回傳 DeleteResult：{ raw: [], affected: 刪除筆數 }，API 規格直接回這個物件
async function deleteSkill(skillId) {
  let result
  try {
    result = await skillRepo.delete(skillId)
  } catch (err) {
    // 技能已被課程使用，資料庫的外鍵限制不讓刪：回清楚的 409，不要變成 500
    if (isForeignKeyViolation(err)) {
      throw new AppError(409, '此技能已被課程使用，無法刪除')
    }
    throw err
  }
  if (result.affected === 0) {
    throw new AppError(400, 'ID錯誤')
  }
  return result
}

module.exports = { listSkills, createSkill, deleteSkill }
