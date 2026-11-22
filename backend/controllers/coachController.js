// M4：教練的公開瀏覽（全部免登入）
const coachService = require('../services/coachService')
const { AppError, isUuid, success } = require('../utils')

// 查詢參數一律是字串，只接受 1~9 位數字（也避免超大數字讓 (page-1)*per 溢位變成 500）
const QUERY_NUMBER_REGEX = /^\d{1,9}$/

function parseCoachId(params) {
  const { coachId } = params
  if (!isUuid(coachId)) {
    throw new AppError(400, '欄位未填寫正確')
  }
  return coachId
}

// GET /api/coaches?per=&page=：教練分頁列表
async function list(req, res) {
  const { per, page } = req.query
  // per、page 必填；同名參數重複出現時會變成陣列，不是字串，也一併擋掉
  if (
    typeof per !== 'string' ||
    typeof page !== 'string' ||
    !QUERY_NUMBER_REGEX.test(per) ||
    !QUERY_NUMBER_REGEX.test(page)
  ) {
    throw new AppError(400, '欄位未填寫正確')
  }
  success(res, await coachService.listCoaches(Number(per), Number(page)))
}

// GET /api/coaches/:coachId：教練詳情
async function getDetail(req, res) {
  const coachId = parseCoachId(req.params)
  success(res, await coachService.getCoachDetail(coachId))
}

// GET /api/coaches/:coachId/courses：這位教練「未結束」的課
async function listCourses(req, res) {
  const coachId = parseCoachId(req.params)
  success(res, await coachService.listCoachUpcomingCourses(coachId))
}

module.exports = { list, getDetail, listCourses }
