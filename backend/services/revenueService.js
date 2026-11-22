// M6：教練月營收的計算
const dataSource = require('../db/data-source')
const CourseBooking = require('../entities/CourseBooking')
const CreditPackage = require('../entities/CreditPackage')

// monthIndex：0 = 一月 … 11 = 十二月
async function getMonthlyRevenue(userId, monthIndex) {
  // 年份固定是伺服器「當年」；月份範圍用伺服器本機時間算，與測試取「當月」的口徑一致
  // 範圍是「左閉右開」：>= 當月 1 日 00:00 且 < 下月 1 日 00:00（monthIndex + 1 = 12 時會自動進位到隔年 1 月）
  const year = new Date().getFullYear()
  const start = new Date(year, monthIndex, 1)
  const end = new Date(year, monthIndex + 1, 1)

  const [bookingStats, packageTotals] = await Promise.all([
    // ① 算進哪個月看「報名建立時間」（b.created_at），不是上課時間；已取消的不計
    //    participants：不重複的學員（同一人報多堂只算 1 人）
    //    bookings：未取消的報名「筆數」，也就是 API 的 course_count（欄位名?）
    dataSource
      .getRepository(CourseBooking)
      .createQueryBuilder('b')
      .innerJoin('b.course', 'c')
      .select('COUNT(*)::int', 'bookings')
      .addSelect('COUNT(DISTINCT b.user_id)::int', 'participants')
      .where('c.user_id = :userId', { userId })
      .andWhere('b.cancelled_at IS NULL')
      .andWhere('b.created_at >= :start', { start })
      .andWhere('b.created_at < :end', { end })
      .getRawOne(),
    // ② 單堂均價用「全部」方案一起算：Σprice ÷ Σcredit_amount
    //    SUM 的結果是 bigint，pg 驅動會回字串，正好直接交給 BigInt()
    dataSource
      .getRepository(CreditPackage)
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.price), 0)', 'total_price')
      .addSelect('COALESCE(SUM(p.credit_amount), 0)', 'total_credits')
      .getRawOne()
  ])

  const { bookings, participants } = bookingStats
  const totalPrice = BigInt(packageTotals.total_price)
  const totalCredits = BigInt(packageTotals.total_credits)

  // revenue = floor(報名數 × 總價 ÷ 總堂數)，floor 在「乘完之後」才做
  // 用 BigInt 做整數運算：不先算出浮點數的均價，就不會有 999.9999 被捨去成 999 的誤差；
  // 整數相除本身就是無條件捨去（數字都是正的）。沒有任何方案時分母是 0，營收當 0
  const revenue = totalCredits === 0n ? 0 : Number((BigInt(bookings) * totalPrice) / totalCredits)

  return { total: { revenue, participants, course_count: bookings } }
}

module.exports = { getMonthlyRevenue }
