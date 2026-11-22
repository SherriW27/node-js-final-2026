// M5：購買紀錄。name、堂數、金額是「購買當下的快照」：方案之後被改價或刪除，紀錄不受影響
const { EntitySchema } = require('typeorm')

module.exports = new EntitySchema({
  name: 'CreditPurchase',
  tableName: 'credit_purchase',
  columns: {
    id: { primary: true, type: 'uuid', generated: 'uuid' },
    user_id: { type: 'uuid' },
    credit_package_id: { type: 'uuid', nullable: true },
    name: { type: 'varchar', length: 50 },
    purchased_credits: { type: 'integer' },
    price_paid: { type: 'integer' },
    purchase_at: { type: 'timestamptz', createDate: true }
  },
  relations: {
    user: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: { name: 'user_id' },
      onDelete: 'CASCADE'
    },
    // 方案被刪時 credit_package_id 變 NULL（SET NULL），但這筆購買紀錄要留著
    creditPackage: {
      type: 'many-to-one',
      target: 'CreditPackage',
      joinColumn: { name: 'credit_package_id' },
      nullable: true,
      onDelete: 'SET NULL'
    }
  },
  indices: [{ columns: ['user_id'] }],
  checks: [{ expression: '"purchased_credits" >= 0' }, { expression: '"price_paid" >= 0' }]
})
