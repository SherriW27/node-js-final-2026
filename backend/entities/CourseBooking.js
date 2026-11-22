// M5：報名紀錄。取消是「軟刪除」：只標 cancelled_at，紀錄保留
const { EntitySchema } = require('typeorm')

module.exports = new EntitySchema({
  name: 'CourseBooking',
  tableName: 'course_booking',
  columns: {
    id: { primary: true, type: 'uuid', generated: 'uuid' },
    user_id: { type: 'uuid' },
    course_id: { type: 'uuid' },
    created_at: { type: 'timestamptz', createDate: true },
    cancelled_at: { type: 'timestamptz', nullable: true }
  },
  relations: {
    user: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: { name: 'user_id' },
      onDelete: 'CASCADE'
    },
    course: {
      type: 'many-to-one',
      target: 'Course',
      joinColumn: { name: 'course_id' },
      onDelete: 'CASCADE'
    }
  },
  // UNIQUE (user_id, course_id)：同一人對同一堂課只能有一筆（含已取消的），所以取消過的課不能再報名
  uniques: [{ columns: ['user_id', 'course_id'] }],
  indices: [{ columns: ['course_id'] }]
})
