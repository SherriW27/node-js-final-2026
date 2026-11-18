// 資料庫交易：fn 裡的所有 SQL 要嘛全部成功（COMMIT），要嘛有任何錯誤就全部復原（ROLLBACK）
const pool = require('./db')

async function withTransaction(fn) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    // 連線一定要還給連線池，否則池子會被借光、之後的請求全部卡住
    client.release()
  }
}

module.exports = withTransaction
