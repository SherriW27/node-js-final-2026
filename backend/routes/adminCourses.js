// M3：教練後台的課程管理（開課、列表、單一課程查詢與更新）
const express = require('express')
const pool = require('../db')
const auth = require('../middlewares/auth')
const requireCoach = require('../middlewares/requireCoach')
const {
  isUuid,
  fail,
  success,
  isForeignKeyViolation,
  isFilledString,
  isNonNegativeInt,
  isHttpsUrl,
  isIsoDateString
} = require('../utils')

const router = express.Router()

const NAME_MAX_LENGTH = 100

// 開課與更新共用的欄位驗證：全部必填；通過回傳整理好的欄位，不通過回 null
function parseCourseBody(body) {
  const {
    skill_id: skillId,
    name,
    description,
    start_at: startAt,
    end_at: endAt,
    max_participants: maxParticipants,
    meeting_url: meetingUrl
  } = body ?? {}

  const isValid =
    isUuid(skillId) &&
    isFilledString(name) &&
    name.trim().length <= NAME_MAX_LENGTH &&
    isFilledString(description) &&
    isIsoDateString(startAt) &&
    isIsoDateString(endAt) &&
    isNonNegativeInt(maxParticipants) && // 必須是 number 型別，字串 "10" 會被擋
    isHttpsUrl(meetingUrl)

  if (!isValid) {
    return null
  }
  return {
    skillId,
    name: name.trim(),
    description: description.trim(),
    startAt,
    endAt,
    maxParticipants,
    meetingUrl
  }
}

// POST /api/admin/coaches/courses：教練開課
router.post('/', auth, requireCoach, async (req, res) => {
  const course = parseCourseBody(req.body)
  if (!course) {
    return fail(res, 400, '欄位未填寫正確')
  }

  try {
    // 開課的教練一律是 token 裡的本人（req.user.id），不接受 body 指定
    const { rows } = await pool.query(
      `INSERT INTO course (user_id, skill_id, name, description, start_at, end_at, max_participants, meeting_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.user.id,
        course.skillId,
        course.name,
        course.description,
        course.startAt,
        course.endAt,
        course.maxParticipants,
        course.meetingUrl
      ]
    )
    success(res, { course: rows[0] }, 201)
  } catch (err) {
    // skill_id 指向不存在的技能
    if (isForeignKeyViolation(err)) {
      return fail(res, 400, '欄位未填寫正確')
    }
    throw err
  }
})

// GET /api/admin/coaches/courses：教練本人開的全部課程
router.get('/', auth, requireCoach, async (req, res) => {
  // status 不存進資料表，每次用「現在時間」與起迄時間比較即時算出
  // TODO(M5)：participants 目前固定 0，等報名資料表做好後，改成「未取消的報名數」
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.start_at, c.end_at, c.max_participants, c.meeting_url,
            CASE
              WHEN now() < c.start_at THEN '尚未開始'
              WHEN now() <= c.end_at THEN '進行中'
              ELSE '已結束'
            END AS status,
            0 AS participants
       FROM course c
      WHERE c.user_id = $1
      ORDER BY c.start_at DESC`,
    [req.user.id]
  )
  success(res, rows)
})

// GET /api/admin/coaches/courses/:courseId：單一課程（只查得到自己的課）
router.get('/:courseId', auth, async (req, res) => {
  const { courseId } = req.params
  if (!isUuid(courseId)) {
    return fail(res, 400, '課程不存在')
  }

  // 同時用「課程 id」和「登入者 id」查：不是你的課，等於查不到，不洩漏它存在
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.description, c.start_at, c.end_at, c.max_participants,
            s.name AS skill_name, c.skill_id, c.meeting_url
       FROM course c
       JOIN skill s ON s.id = c.skill_id
      WHERE c.id = $1 AND c.user_id = $2`,
    [courseId, req.user.id]
  )
  if (rows.length === 0) {
    return fail(res, 400, '課程不存在')
  }
  // 注意：這支回「扁平物件」，data 直接就是課程欄位，沒有再包一層 course
  success(res, rows[0])
})

// PUT /api/admin/coaches/courses/:courseId：更新課程（全欄位必填，只改得到自己的課）
router.put('/:courseId', auth, async (req, res) => {
  // 先驗欄位、再驗擁有者（依文件順序）
  const course = parseCourseBody(req.body)
  if (!course) {
    return fail(res, 400, '欄位未填寫正確')
  }

  const { courseId } = req.params
  if (!isUuid(courseId)) {
    return fail(res, 400, '課程不存在')
  }

  try {
    const { rows } = await pool.query(
      `UPDATE course
          SET skill_id = $1, name = $2, description = $3, start_at = $4, end_at = $5,
              max_participants = $6, meeting_url = $7, updated_at = now()
        WHERE id = $8 AND user_id = $9
    RETURNING *`,
      [
        course.skillId,
        course.name,
        course.description,
        course.startAt,
        course.endAt,
        course.maxParticipants,
        course.meetingUrl,
        courseId,
        req.user.id
      ]
    )
    if (rows.length === 0) {
      return fail(res, 400, '課程不存在')
    }
    // 這支回 { course: {...} }，跟上面 GET 單一課程的扁平形狀不同
    success(res, { course: rows[0] })
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return fail(res, 400, '欄位未填寫正確')
    }
    throw err
  }
})

module.exports = router
