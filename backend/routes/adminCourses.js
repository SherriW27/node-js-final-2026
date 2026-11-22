// M3：教練後台的課程管理（開課、列表、單一課程查詢與更新）
const express = require('express')
const auth = require('../middlewares/auth')
const requireCoach = require('../middlewares/requireCoach')
const adminCourseController = require('../controllers/adminCourseController')

const router = express.Router()

router.post('/', auth, requireCoach, adminCourseController.create)
router.get('/', auth, requireCoach, adminCourseController.list)
// 單一課程的查詢與更新只要求登入：查詢條件已經限定「自己的課」
router.get('/:courseId', auth, adminCourseController.getOne)
router.put('/:courseId', auth, adminCourseController.update)

module.exports = router
