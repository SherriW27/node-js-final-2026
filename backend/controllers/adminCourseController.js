// M3：教練後台的課程管理（開課、列表、單一課程查詢與更新）
const adminCourseService = require('../services/adminCourseService')
const {
  AppError,
  isUuid,
  success,
  isFilledString,
  isNonNegativeInt,
  isHttpsUrl,
  isIsoDateString
} = require('../utils')

const NAME_MAX_LENGTH = 100

// 開課與更新共用的欄位驗證：全部必填；通過回傳可以直接寫進 Course 的欄位，不通過丟 400
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
    throw new AppError(400, '欄位未填寫正確')
  }
  return {
    skill_id: skillId,
    name: name.trim(),
    description: description.trim(),
    start_at: startAt,
    end_at: endAt,
    max_participants: maxParticipants,
    meeting_url: meetingUrl
  }
}

function parseCourseId(params) {
  const { courseId } = params
  if (!isUuid(courseId)) {
    throw new AppError(400, adminCourseService.COURSE_NOT_FOUND)
  }
  return courseId
}

// POST /api/admin/coaches/courses：教練開課
async function create(req, res) {
  const fields = parseCourseBody(req.body)
  const course = await adminCourseService.createCourse(req.user.id, fields)
  success(res, { course }, 201)
}

// GET /api/admin/coaches/courses：教練本人開的全部課程
async function list(req, res) {
  success(res, await adminCourseService.listCoachCourses(req.user.id))
}

// GET /api/admin/coaches/courses/:courseId：單一課程（只查得到自己的課）
async function getOne(req, res) {
  const courseId = parseCourseId(req.params)
  const course = await adminCourseService.getCoachCourse(req.user.id, courseId)
  // 這支回「扁平物件」，data 直接就是課程欄位，沒有再包一層 course
  success(res, course)
}

// PUT /api/admin/coaches/courses/:courseId：更新課程（全欄位必填，只改得到自己的課）
async function update(req, res) {
  // 先驗欄位、再驗課程 id（依文件順序）
  const fields = parseCourseBody(req.body)
  const courseId = parseCourseId(req.params)
  const course = await adminCourseService.updateCoachCourse(req.user.id, courseId, fields)
  // 這支回 { course: {...} }，跟上面 GET 單一課程的扁平形狀不同
  success(res, { course })
}

module.exports = { create, list, getOne, update }
