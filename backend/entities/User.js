// M2：會員。password 存 bcrypt 雜湊，不存明文；role 只能是 USER 或 COACH
// 用 EntitySchema 定義資料表：純 JavaScript 不能用 TypeScript 的 @Entity() 裝飾器，這是 TypeORM 給 JS 的寫法
const { EntitySchema } = require('typeorm')

module.exports = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: { primary: true, type: 'uuid', generated: 'uuid' },
    name: { type: 'varchar', length: 50 },
    email: { type: 'varchar', length: 320, unique: true },
    // select: false：一般查詢不會帶出密碼，真的需要時（登入、驗證 token）要在 select 明確指定
    password: { type: 'varchar', length: 72, select: false },
    role: { type: 'varchar', length: 10, default: 'USER' },
    // createDate / updateDate：新增時自動填入現在時間；透過 TypeORM 更新時自動刷新 updated_at
    created_at: { type: 'timestamp', createDate: true },
    updated_at: { type: 'timestamp', updateDate: true }
  },
  checks: [{ expression: `"role" IN ('USER', 'COACH')` }]
})
