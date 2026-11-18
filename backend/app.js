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
