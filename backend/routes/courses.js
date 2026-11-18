// 全站課程（M4：進行中課程列表。M5 會在這支檔案加上報名、取消報名）
const express = require('express')
const pool = require('../db')
const PUBLIC_COURSE_SELECT = require('../publicCourseSelect')
const { success } = require('../utils')

const router = express.Router()

// GET /api/courses：全站「進行中」的課程（start_at <= now < end_at）
// 尚未開始與已結束的都不回；跟教練課表（end_at > now）是不同的條件
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `${PUBLIC_COURSE_SELECT}
      WHERE c.start_at <= now() AND now() < c.end_at
      ORDER BY c.start_at, c.id`
  )
  success(res, rows)
})

module.exports = router
