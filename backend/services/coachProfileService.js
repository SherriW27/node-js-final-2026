// M3：教練資料的商業邏輯與資料存取（升級教練、查看與更新自己的教練資料）
const dataSource = require('../db/data-source')
const User = require('../entities/User')
const Coach = require('../entities/Coach')
const { AppError, isUniqueViolation, isForeignKeyViolation } = require('../utils')

const NOT_COACH_MESSAGE = '使用者尚未成為教練'

// 查某位使用者的教練資料與技能 id 清單；查不到回 null
// manager 可以是 dataSource.manager，也可以是交易中的 manager
async function findCoachProfile(manager, userId) {
  // relations: { skills: true }：一起載入多對多的技能（TypeORM 會自動 JOIN 中間表 coach_link_skill）
  const coach = await manager.findOne(Coach, {
    where: { user_id: userId },
    relations: { skills: true }
  })
  if (!coach) {
    return null
  }
  return {
    id: coach.id,
    experience_years: coach.experience_years,
    description: coach.description,
    profile_image_url: coach.profile_image_url,
    skill_ids: coach.skills.map((skill) => skill.id)
  }
}

// 教練查看自己的資料
async function getProfile(userId) {
  const profile = await findCoachProfile(dataSource.manager, userId)
  if (!profile) {
    throw new AppError(401, NOT_COACH_MESSAGE)
  }
  return profile
}

// 教練更新自己的資料（skillIds 是整批覆蓋）
async function updateProfile(userId, { experienceYears, description, profileImageUrl, skillIds }) {
  try {
    // transaction()：裡面用 manager 做的事要嘛全部成功（COMMIT），要嘛有錯就全部復原（ROLLBACK）
    return await dataSource.transaction(async (manager) => {
      const coach = await manager.findOne(Coach, {
        where: { user_id: userId },
        relations: { skills: true }
      })
      if (!coach) {
        throw new AppError(401, NOT_COACH_MESSAGE)
      }

      // 整批覆蓋：直接把 skills 換成新的清單，save() 會比對新舊差異，
      // 自動在中間表新增少掉的、刪除多出來的。id 統一轉小寫再去重，避免同一技能被當成兩個
      const uniqueSkillIds = [...new Set(skillIds.map((id) => id.toLowerCase()))]
      coach.experience_years = experienceYears
      coach.description = description
      coach.profile_image_url = profileImageUrl
      coach.skills = uniqueSkillIds.map((id) => ({ id }))
      coach.updated_at = new Date()
      await manager.save(Coach, coach)

      return findCoachProfile(manager, userId)
    })
  } catch (err) {
    // skill_ids 裡有不存在的技能：外鍵檢查失敗，整個交易已復原
    if (isForeignKeyViolation(err)) {
      throw new AppError(400, '欄位未填寫正確')
    }
    throw err
  }
}

// 把會員升級成教練
async function upgradeToCoach(userId, { experienceYears, description, profileImageUrl }) {
  try {
    return await dataSource.transaction(async (manager) => {
      // lock pessimistic_write = SELECT ... FOR UPDATE：把這位使用者鎖住，
      // 兩個請求同時升級同一個人時，第二個要等第一個做完
      const user = await manager.findOne(User, {
        where: { id: userId },
        select: { id: true, name: true, role: true },
        lock: { mode: 'pessimistic_write' }
      })
      if (!user) {
        throw new AppError(400, '使用者不存在')
      }
      if (user.role === 'COACH') {
        throw new AppError(409, '使用者已經是教練')
      }

      // EntitySchema 建出來的是一般物件，manager.save() 要明確告訴它是哪個 entity
      const coach = await manager.save(
        Coach,
        manager.create(Coach, {
          user_id: userId,
          experience_years: experienceYears,
          description,
          profile_image_url: profileImageUrl
        })
      )
      // 建教練資料與改 role 在同一個交易裡：不會出現「有教練資料但還是一般會員」
      await manager.update(User, userId, { role: 'COACH' })

      return { user: { name: user.name, role: 'COACH' }, coach }
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new AppError(409, '使用者已經是教練')
    }
    throw err
  }
}

module.exports = { getProfile, updateProfile, upgradeToCoach }
