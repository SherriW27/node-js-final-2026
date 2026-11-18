// M3：教練資料（升級教練、查看與更新自己的教練資料）
const express = require('express')
const pool = require('../db')
const withTransaction = require('../withTransaction')
const auth = require('../middlewares/auth')
const requireCoach = require('../middlewares/requireCoach')
const {
  isUuid,
  fail,
  success,
  isUniqueViolation,
  isForeignKeyViolation,
  isFilledString,
  isNonNegativeInt,
  isHttpsUrl
} = require('../utils')

const router = express.Router()

// 查某位使用者的教練資料與技能 id 清單（db 可以是連線池，也可以是交易中的 client）
async function findCoachProfile(db, userId) {
  const { rows } = await db.query(
    `SELECT c.id, c.experience_years, c.description, c.profile_image_url,
            COALESCE(array_agg(l.skill_id::text) FILTER (WHERE l.skill_id IS NOT NULL), '{}') AS skill_ids
       FROM coach c
       LEFT JOIN coach_link_skill l ON l.coach_id = c.id
      WHERE c.user_id = $1
      GROUP BY c.id`,
    [userId]
  )
  return rows[0]
}

// GET /api/admin/coaches：教練查看自己的資料
router.get('/', auth, requireCoach, async (req, res) => {
  const profile = await findCoachProfile(pool, req.user.id)
  if (!profile) {
    return fail(res, 401, '使用者尚未成為教練')
  }
  success(res, profile)
})

// PUT /api/admin/coaches：教練更新自己的資料（skill_ids 是整批覆蓋）
router.put('/', auth, requireCoach, async (req, res) => {
  const {
    experience_years: experienceYears,
    description,
    profile_image_url: profileImageUrl,
    skill_ids: skillIds
  } = req.body ?? {}

  const isSkillIdsValid =
    Array.isArray(skillIds) && skillIds.length > 0 && skillIds.every((id) => isUuid(id))
  if (
    !isNonNegativeInt(experienceYears) ||
    !isFilledString(description) ||
    !isHttpsUrl(profileImageUrl) || // 這支是必填，跟「升級教練」的選填規則不同
    !isSkillIdsValid
  ) {
    return fail(res, 400, '欄位未填寫正確')
  }

  try {
    const profile = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE coach
            SET experience_years = $1, description = $2, profile_image_url = $3, updated_at = now()
          WHERE user_id = $4
      RETURNING id`,
        [experienceYears, description.trim(), profileImageUrl, req.user.id]
      )
      if (rows.length === 0) {
        return null
      }
      const coachId = rows[0].id

      // 整批覆蓋：先清掉舊的技能，再寫入新的（去重，避免同一技能重複寫入撞到主鍵）
      await client.query('DELETE FROM coach_link_skill WHERE coach_id = $1', [coachId])
      await client.query(
        `INSERT INTO coach_link_skill (coach_id, skill_id)
         SELECT $1, unnest($2::uuid[])
         ON CONFLICT DO NOTHING`,
        [coachId, skillIds]
      )
      return findCoachProfile(client, req.user.id)
    })

    if (!profile) {
      return fail(res, 401, '使用者尚未成為教練')
    }
    success(res, profile)
  } catch (err) {
    // skill_ids 裡有不存在的技能：外鍵檢查失敗，整個交易已復原
    if (isForeignKeyViolation(err)) {
      return fail(res, 400, '欄位未填寫正確')
    }
    throw err
  }
})

// POST /api/admin/coaches/:userId：把會員升級成教練（課程簡化：public，不需登入）
router.post('/:userId', async (req, res) => {
  const { experience_years: experienceYears, description, profile_image_url: imageUrl } =
    req.body ?? {}

  // profile_image_url 選填：不給、null、空字串都可以；但有值就必須是 https
  const hasImage = imageUrl !== undefined && imageUrl !== null && imageUrl !== ''
  if (
    !isNonNegativeInt(experienceYears) ||
    !isFilledString(description) ||
    (hasImage && !isHttpsUrl(imageUrl))
  ) {
    return fail(res, 400, '欄位未填寫正確')
  }

  const { userId } = req.params
  if (!isUuid(userId)) {
    return fail(res, 400, '使用者不存在')
  }

  try {
    const result = await withTransaction(async (client) => {
      // FOR UPDATE 把這位使用者鎖住，兩個請求同時升級同一個人時，第二個要等第一個做完
      const { rows } = await client.query(
        'SELECT id, name, role FROM users WHERE id = $1 FOR UPDATE',
        [userId]
      )
      const user = rows[0]
      if (!user) {
        return { error: [400, '使用者不存在'] }
      }
      if (user.role === 'COACH') {
        return { error: [409, '使用者已經是教練'] }
      }

      const coachResult = await client.query(
        `INSERT INTO coach (user_id, experience_years, description, profile_image_url)
         VALUES ($1, $2, $3, $4)
         RETURNING id, user_id, experience_years, description, profile_image_url, created_at, updated_at`,
        [userId, experienceYears, description.trim(), hasImage ? imageUrl : null]
      )
      // 建教練資料與改 role 在同一個交易裡：不會出現「有教練資料但還是一般會員」
      await client.query("UPDATE users SET role = 'COACH', updated_at = now() WHERE id = $1", [userId])

      return { data: { user: { name: user.name, role: 'COACH' }, coach: coachResult.rows[0] } }
    })

    if (result.error) {
      return fail(res, ...result.error)
    }
    success(res, result.data, 201)
  } catch (err) {
    if (isUniqueViolation(err)) {
      return fail(res, 409, '使用者已經是教練')
    }
    throw err
  }
})

module.exports = router
