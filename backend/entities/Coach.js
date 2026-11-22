// M3：教練資料。一個使用者最多一筆教練資料；使用者被刪時一併刪除
const { EntitySchema } = require('typeorm')

module.exports = new EntitySchema({
  name: 'Coach',
  tableName: 'coach',
  columns: {
    id: { primary: true, type: 'uuid', generated: 'uuid' },
    // 外鍵欄位也宣告成一般欄位，查詢、回傳時可以直接用 user_id，不必先載入整個 user 關聯
    user_id: { type: 'uuid' },
    experience_years: { type: 'integer' },
    description: { type: 'text' },
    profile_image_url: { type: 'text', nullable: true },
    created_at: { type: 'timestamptz', createDate: true },
    updated_at: { type: 'timestamptz', updateDate: true }
  },
  relations: {
    // one-to-one 會自動在 user_id 上加 UNIQUE：同一個人不會有兩筆教練資料
    user: {
      type: 'one-to-one',
      target: 'User',
      joinColumn: { name: 'user_id' },
      onDelete: 'CASCADE'
    },
    // 教練與技能是多對多：TypeORM 會自動建立中間表 coach_link_skill（複合主鍵 coach_id + skill_id），
    // 兩邊任一筆被刪時，中間表的關聯會一併刪除
    skills: {
      type: 'many-to-many',
      target: 'Skill',
      joinTable: {
        name: 'coach_link_skill',
        joinColumn: { name: 'coach_id' },
        inverseJoinColumn: { name: 'skill_id' }
      }
    }
  },
  checks: [{ expression: '"experience_years" >= 0' }]
})
