// 全站課程：M4 進行中課程列表、M5 報名與取消報名
const courseService = require('../services/courseService')
const { AppError, isUuid, success } = require('../utils')

function parseCourseId(params) {
  const { courseId } = params
  if (!isUuid(courseId)) {
    throw new AppError(400, courseService.BOOKING_MESSAGES.COURSE_NOT_FOUND)
  }
  return courseId
}

// GET /api/courses：全站「進行中」的課程
async function listOngoing(req, res) {
  success(res, await courseService.listOngoingCourses())
}

// POST /api/courses/:courseId：報名課程（需登入，不需要 body）
async function book(req, res) {
  const courseId = parseCourseId(req.params)
  await courseService.bookCourse(req.user.id, courseId)
  success(res, null, 201)
}

// DELETE /api/courses/:courseId：取消報名
async function cancel(req, res) {
  const courseId = parseCourseId(req.params)
  await courseService.cancelBooking(req.user.id, courseId)
  success(res, null)
}

module.exports = { listOngoing, book, cancel }
