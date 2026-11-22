// 全站課程：M4 進行中課程列表、M5 報名與取消報名
const express = require('express')
const auth = require('../middlewares/auth')
const courseController = require('../controllers/courseController')

const router = express.Router()

router.get('/', courseController.listOngoing)
router.post('/:courseId', auth, courseController.book)
router.delete('/:courseId', auth, courseController.cancel)

module.exports = router
