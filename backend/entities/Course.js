// M3：課程。user_id 是開課教練的「使用者 id」
const { EntitySchema } = require('typeorm')

module.exports = new EntitySchema({
  name: 'Course',
  tableName: 'course',
  columns: {
    id: { primary: true, type: 'uuid', generated: 'uuid' },
    user_id: { type: 'uuid' },
    skill_id: { type: 'uuid' },
    name: { type: 'varchar', length: 100 },
    description: { type: 'text' },
    start_at: { type: 'timestamptz' },
    end_at: { type: 'timestamptz' },
    max_participants: { type: 'integer' },
    meeting_url: { type: 'text' },
    created_at: { type: 'timestamptz', createDate: true },
    updated_at: { type: 'timestamptz', updateDate: true }
  },
  relations: {
    user: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: { name: 'user_id' },
      onDelete: 'CASCADE'
    },
    // 沒寫 onDelete：預設 NO ACTION，技能還被課程使用時資料庫不讓刪
    skill: {
      type: 'many-to-one',
      target: 'Skill',
      joinColumn: { name: 'skill_id' }
    }
  },
  checks: [{ expression: '"max_participants" >= 0' }]
})
