// M1：購買方案。credit_amount（堂數）、price（價格）都是 0 以上的整數
const { EntitySchema } = require('typeorm')

module.exports = new EntitySchema({
  name: 'CreditPackage',
  tableName: 'credit_package',
  columns: {
    id: { primary: true, type: 'uuid', generated: 'uuid' },
    name: { type: 'varchar', length: 50, unique: true },
    credit_amount: { type: 'integer' },
    price: { type: 'integer' },
    // 跟 Skill 一樣：API 回傳 createdAt，資料表欄位是 created_at
    createdAt: { name: 'created_at', type: 'timestamp', createDate: true }
  },
  checks: [{ expression: '"credit_amount" >= 0' }, { expression: '"price" >= 0' }]
})
