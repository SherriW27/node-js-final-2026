// M4：教練的公開瀏覽（全部免登入）
const express = require('express')
const coachController = require('../controllers/coachController')

const router = express.Router()

router.get('/', coachController.list)
router.get('/:coachId', coachController.getDetail)
router.get('/:coachId/courses', coachController.listCourses)

module.exports = router
