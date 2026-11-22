// 啟動入口：等資料庫就緒、資料表建好後才開始監聽
const app = require('../app')
const dataSource = require('../db/data-source')

const port = Number(process.env.PORT) || 8080
const MAX_RETRIES = 30
const RETRY_DELAY_MS = 2000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// 資料庫容器可能比後端晚準備好，所以連不上時每 2 秒重試一次
// initialize() 會建立連線池；DB_SYNCHRONIZE=true 時也會在這一步依 entities 自動建表
async function connectDatabase() {
  for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
      await dataSource.initialize()
      return
    } catch (err) {
      console.log(`等待資料庫就緒 (${i}/${MAX_RETRIES}): ${err.message}`)
      await sleep(RETRY_DELAY_MS)
    }
  }
  throw new Error('資料庫連線失敗')
}

async function start() {
  await connectDatabase()
  // 沒有開自動同步時，改用 migration 建表：只會執行還沒跑過的檔案，已經跑過的會跳過
  if (!dataSource.options.synchronize) {
    const migrations = await dataSource.runMigrations()
    migrations.forEach((m) => console.log(`已執行 migration：${m.name}`))
  }

  const server = app.listen(port, () => {
    console.log(`服務已啟動：http://localhost:${port}`)
  })

  process.on('SIGTERM', () => {
    server.close(async () => {
      await dataSource.destroy()
      process.exit(0)
    })
  })
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
