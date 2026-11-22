// M1：技能管理（全部 public，不需登入）
const express = require('express')
const skillController = require('../controllers/skillController')

const router = express.Router()

router.get('/', skillController.list)
router.post('/', skillController.create)
router.delete('/:skillId', skillController.remove)

module.exports = router
