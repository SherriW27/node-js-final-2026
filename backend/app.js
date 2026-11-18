// Express 應用程式：middleware 與路由
const express = require('express')
const cors = require('cors')
const pool = require('./db')

const app = express()

app.use(cors())
app.use(express.json())

// M0：服務健康檢查，資料庫可連線才回 200 純文字 OK
app.get('/healthcheck', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.status(200).type('text/plain').send('OK')
  } catch (err) {
    res.status(503).type('text/plain').send('Service Unavailable')
  }
})

// M1：技能與方案。技能路由要比之後的 /api/coaches/:coachId 先註冊，
// 否則 "skill" 這個字會被當成 coachId
app.use('/api/coaches/skill', require('./routes/skill'))
app.use('/api/credit-package', require('./routes/creditPackage'))

// M2：會員系統
app.use('/api/users', require('./routes/users'))

// M3：教練後台。⚠️ courses 要掛在 coaches 前面，
// 否則 POST /api/admin/coaches/courses 會被 POST /api/admin/coaches/:userId 吃掉（userId = "courses"）
app.use('/api/admin/coaches/courses', require('./routes/adminCourses'))
app.use('/api/admin/coaches/revenue', require('./routes/adminRevenue')) // M6：月營收
app.use('/api/admin/coaches', require('./routes/adminCoaches'))

// M4：公開瀏覽。⚠️ /api/coaches 要掛在 /api/coaches/skill（上面 M1）之後，
// 否則 GET /api/coaches/skill 會被 /api/coaches/:coachId 吃掉（coachId = "skill"）
app.use('/api/coaches', require('./routes/coaches'))
app.use('/api/courses', require('./routes/courses'))

// 沒有任何路由接得到的請求：回 404 failed
app.use((req, res) => {
  res.status(404).json({ status: 'failed', message: '無此路由' })
})

// 全域錯誤處理：未預期的錯誤回 500，不把內部錯誤細節洩漏給前端
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ status: 'failed', message: '伺服器錯誤' })
})

module.exports = app
