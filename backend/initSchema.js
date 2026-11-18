// 啟動時自動建表：後端連到的是空資料庫，所以要自己把需要的資料表建好
const pool = require('./db')

async function initSchema() {
  // M2：會員。password 存 bcrypt 雜湊，不存明文；role 只能是 USER 或 COACH
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name varchar(50) NOT NULL,
      email varchar(320) NOT NULL UNIQUE,
      password varchar(72) NOT NULL,
      role varchar(10) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'COACH')),
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `)

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
  // M3：教練資料。user_id UNIQUE：一個人只能有一筆教練資料；使用者被刪時一併刪除
  await pool.query(`
    CREATE TABLE IF NOT EXISTS coach (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
      experience_years integer NOT NULL CHECK (experience_years >= 0),
      description text NOT NULL,
      profile_image_url text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `)

  // M3：教練與技能的多對多關聯表。複合主鍵避免同一技能綁兩次；兩邊被刪時關聯一併消失
  await pool.query(`
    CREATE TABLE IF NOT EXISTS coach_link_skill (
      coach_id uuid NOT NULL REFERENCES coach (id) ON DELETE CASCADE,
      skill_id uuid NOT NULL REFERENCES skill (id) ON DELETE CASCADE,
      PRIMARY KEY (coach_id, skill_id)
    )
  `)

  // M3：課程。user_id 是開課教練的「使用者 id」；技能被課程使用時不能刪（預設 RESTRICT）
  await pool.query(`
    CREATE TABLE IF NOT EXISTS course (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      skill_id uuid NOT NULL REFERENCES skill (id),
      name varchar(100) NOT NULL,
      description text NOT NULL,
      start_at timestamptz NOT NULL,
      end_at timestamptz NOT NULL,
      max_participants integer NOT NULL CHECK (max_participants >= 0),
      meeting_url text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `)
  // M5：購買紀錄。name、堂數、金額是「購買當下的快照」：方案之後被改價或刪除，紀錄不受影響
  // 方案被刪時 credit_package_id 變 NULL（SET NULL），但這筆購買紀錄要留著
  await pool.query(`
    CREATE TABLE IF NOT EXISTS credit_purchase (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      credit_package_id uuid REFERENCES credit_package (id) ON DELETE SET NULL,
      name varchar(50) NOT NULL,
      purchased_credits integer NOT NULL CHECK (purchased_credits >= 0),
      price_paid integer NOT NULL CHECK (price_paid >= 0),
      purchase_at timestamptz NOT NULL DEFAULT now()
    )
  `)
  await pool.query('CREATE INDEX IF NOT EXISTS idx_credit_purchase_user ON credit_purchase (user_id)')

  // M5：報名紀錄。取消是「軟刪除」：只標 cancelled_at，紀錄保留
  // UNIQUE (user_id, course_id)：同一人對同一堂課只能有一筆（含已取消的），所以取消過的課不能再報名
  await pool.query(`
    CREATE TABLE IF NOT EXISTS course_booking (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      course_id uuid NOT NULL REFERENCES course (id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      cancelled_at timestamptz,
      UNIQUE (user_id, course_id)
    )
  `)
  await pool.query('CREATE INDEX IF NOT EXISTS idx_course_booking_course ON course_booking (course_id)')
}

module.exports = initSchema
