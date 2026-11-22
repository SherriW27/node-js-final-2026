// M3：教練資料（升級教練、查看與更新自己的教練資料）
const coachProfileService = require('../services/coachProfileService')
const { AppError, isUuid, success, isFilledString, isNonNegativeInt, isHttpsUrl } = require('../utils')

// GET /api/admin/coaches：教練查看自己的資料
async function getProfile(req, res) {
  success(res, await coachProfileService.getProfile(req.user.id))
}

// PUT /api/admin/coaches：教練更新自己的資料（skill_ids 是整批覆蓋）
async function updateProfile(req, res) {
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
    throw new AppError(400, '欄位未填寫正確')
  }

  const profile = await coachProfileService.updateProfile(req.user.id, {
    experienceYears,
    description: description.trim(),
    profileImageUrl,
    skillIds
  })
  success(res, profile)
}

// POST /api/admin/coaches/:userId：把會員升級成教練（故意的bug，不需登入）
async function upgrade(req, res) {
  const { experience_years: experienceYears, description, profile_image_url: imageUrl } =
    req.body ?? {}

  // profile_image_url 選填：不給、null、空字串都可以；但有值就必須是 https
  const hasImage = imageUrl !== undefined && imageUrl !== null && imageUrl !== ''
  if (
    !isNonNegativeInt(experienceYears) ||
    !isFilledString(description) ||
    (hasImage && !isHttpsUrl(imageUrl))
  ) {
    throw new AppError(400, '欄位未填寫正確')
  }

  // 先驗 body、再驗 userId（依文件順序）
  const { userId } = req.params
  if (!isUuid(userId)) {
    throw new AppError(400, '使用者不存在')
  }

  const data = await coachProfileService.upgradeToCoach(userId, {
    experienceYears,
    description: description.trim(),
    profileImageUrl: hasImage ? imageUrl : null
  })
  success(res, data, 201)
}

module.exports = { getProfile, updateProfile, upgrade }
