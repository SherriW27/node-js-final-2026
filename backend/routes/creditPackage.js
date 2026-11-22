// M1：購買方案管理（新增、列表、刪除為 public）；M5：購買方案（需登入）
const express = require('express')
const auth = require('../middlewares/auth')
const creditPackageController = require('../controllers/creditPackageController')

const router = express.Router()

router.get('/', creditPackageController.list)
router.post('/', creditPackageController.create)
router.post('/:creditPackageId', auth, creditPackageController.purchase)
router.delete('/:creditPackageId', creditPackageController.remove)

module.exports = router
