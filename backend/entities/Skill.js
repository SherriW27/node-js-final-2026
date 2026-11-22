// M1：技能。name 加 UNIQUE，由資料庫保證名稱不重複
const { EntitySchema } = require('typeorm')

module.exports = new EntitySchema({
  name: 'Skill',
  tableName: 'skill',
  columns: {
    id: { primary: true, type: 'uuid', generated: 'uuid' },
    name: { type: 'varchar', length: 50, unique: true },
    // API 回傳的欄位是 createdAt，所以屬性取 createdAt，資料表欄位名稱另外用 name 指定成 created_at
    createdAt: { name: 'created_at', type: 'timestamp', createDate: true }
  }
})
