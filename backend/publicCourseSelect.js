// 公開課程列表共用的 SELECT 與 JOIN：每筆課程要多附 coach_name 與 skill_name
// 這兩個欄位不屬於 course 表，是 JOIN users、skill 組出來的
// ⚠️ 這裡刻意「不含 WHERE」：教練課表（end_at > now）與全站進行中（start_at <= now < end_at）
// 的時間條件不同，要由各自的路由自己加，避免寫成同一個條件
const PUBLIC_COURSE_SELECT = `
  SELECT c.id, c.name, c.description, c.start_at, c.end_at, c.max_participants,
         u.name AS coach_name, s.name AS skill_name
    FROM course c
    JOIN users u ON u.id = c.user_id
    JOIN skill s ON s.id = c.skill_id
`

module.exports = PUBLIC_COURSE_SELECT
