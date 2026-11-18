// 啟動時自動建表：後端連到的是空資料庫，所以要自己把需要的資料表建好
const pool = require('./db')

async function initSchema() {
  // M1：技能。name 加 UNIQUE，由資料庫保證名稱不重複
  await pool.query(`
    CREATE TABLE IF NOT EXISTS skill (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name varchar(50) NOT NULL UNIQUE,
      created_at timestamp NOT NULL DEFAULT now()
    )
  `)

  // M1：購買方案。credit_amount（堂數）、price（價格）都是 0 以上的整數
  await pool.query(`
    CREATE TABLE IF NOT EXISTS credit_package (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name varchar(50) NOT NULL UNIQUE,
      credit_amount integer NOT NULL CHECK (credit_amount >= 0),
      price integer NOT NULL CHECK (price >= 0),
      created_at timestamp NOT NULL DEFAULT now()
    )
  `)
}

module.exports = initSchema
