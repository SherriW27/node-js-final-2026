// M6：教練月營收（只有教練本人能查自己的）
const express = require('express')
const auth = require('../middlewares/auth')
const requireCoach = require('../middlewares/requireCoach')
const adminRevenueController = require('../controllers/adminRevenueController')

const router = express.Router()

router.get('/', auth, requireCoach, adminRevenueController.getMonthly)

module.exports = router
