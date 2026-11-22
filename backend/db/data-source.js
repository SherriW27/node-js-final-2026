// TypeORM 的資料庫連線設定（DataSource）。和 typeorm CLI（migration 指令）共用這個檔案
require('dotenv').config()
const path = require('path')
const { DataSource } = require('typeorm')

// DB_SYNCHRONIZE=true：啟動時 TypeORM 依 entities 自動建表、改表（CI 驗收用）
const synchronize = process.env.DB_SYNCHRONIZE === 'true'

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  ssl: process.env.DB_ENABLE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [path.join(__dirname, '..', 'entities', '*.js')],
  migrations: [path.join(__dirname, '..', 'migrations', '*.js')],
  synchronize,
  // uuid 主鍵用 PostgreSQL 內建的 gen_random_uuid() 產生
  uuidExtension: 'pgcrypto',
  // DB_LOGGING=true：把 TypeORM 實際送出的每一句 SQL 印出來
  logging: process.env.DB_LOGGING === 'true'
})

module.exports = dataSource
