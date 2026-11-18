// 啟動入口：等資料庫就緒後才開始監聽
const app = require('../app')
const pool = require('../db')
const initSchema = require('../initSchema')

const port = Number(process.env.PORT) || 8080
const MAX_RETRIES = 30
const RETRY_DELAY_MS = 2000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForDatabase() {
  for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
      await pool.query('SELECT 1')
      return
    } catch (err) {
      console.log(`等待資料庫就緒 (${i}/${MAX_RETRIES}): ${err.message}`)
      await sleep(RETRY_DELAY_MS)
    }
  }
  throw new Error('資料庫連線失敗')
}

async function start() {
  await waitForDatabase()
  await initSchema()
  const server = app.listen(port, () => {
    console.log(`服務已啟動：http://localhost:${port}`)
  })

  process.on('SIGTERM', () => {
    server.close(async () => {
      await pool.end()
      process.exit(0)
    })
  })
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
