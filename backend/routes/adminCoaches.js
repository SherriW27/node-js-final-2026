// M3：教練資料（升級教練、查看與更新自己的教練資料）
const express = require('express')
const auth = require('../middlewares/auth')
const requireCoach = require('../middlewares/requireCoach')
const adminCoachController = require('../controllers/adminCoachController')

const router = express.Router()

router.get('/', auth, requireCoach, adminCoachController.getProfile)
router.put('/', auth, requireCoach, adminCoachController.updateProfile)
router.post('/:userId', adminCoachController.upgrade) // 不需登入

module.exports = router
