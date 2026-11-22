// M2：會員系統（註冊、登入、個人資料、修改密碼）；M5：購買紀錄、課表
const express = require('express')
const auth = require('../middlewares/auth')
const userController = require('../controllers/userController')

const router = express.Router()

router.post('/signup', userController.signup)
router.post('/login', userController.login)
router.get('/profile', auth, userController.getProfile)
router.put('/profile', auth, userController.updateProfile)
router.put('/password', auth, userController.changePassword)
router.get('/credit-package', auth, userController.listPurchases)
router.get('/courses', auth, userController.listMyCourses)

module.exports = router
