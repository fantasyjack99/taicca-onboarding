export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export function formatTaiwanDate(date: Date): string {
  const year = date.getFullYear() - 1911
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year} 年 ${month} 月 ${day} 日`
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Calculate deadline 5 working days before start date
export function workingDaysDeadline(startDate: Date, days: number = 5): Date {
  const result = new Date(startDate)
  let count = 0
  while (count < days) {
    result.setDate(result.getDate() - 1)
    const dow = result.getDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return result
}
