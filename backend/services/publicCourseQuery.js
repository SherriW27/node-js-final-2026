// 公開課程列表共用的查詢：每筆課程要多附 coach_name 與 skill_name
// 這兩個欄位不屬於 course 表，是 JOIN users、skill 組出來的
// ⚠️ 這裡刻意「不含 WHERE」：教練課表（end_at > now）與全站進行中（start_at <= now < end_at）
// 的時間條件不同，要由各自的 service 自己加，避免寫成同一個條件
const dataSource = require('../db/data-source')
const Course = require('../entities/Course')

// 每次呼叫都回傳一個新的 QueryBuilder，service 再接 .where()、.orderBy()，最後 .getRawMany()
function createPublicCourseQuery() {
  return dataSource
    .getRepository(Course)
    .createQueryBuilder('c')
    .innerJoin('c.user', 'u')
    .innerJoin('c.skill', 's')
    .select('c.id', 'id')
    .addSelect('c.name', 'name')
    .addSelect('c.description', 'description')
    .addSelect('c.start_at', 'start_at')
    .addSelect('c.end_at', 'end_at')
    .addSelect('c.max_participants', 'max_participants')
    .addSelect('u.name', 'coach_name')
    .addSelect('s.name', 'skill_name')
}

module.exports = createPublicCourseQuery
