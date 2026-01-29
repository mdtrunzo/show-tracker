export const yearOf = (dateStr: string) => {
  return new Date(dateStr + 'T00:00:00').getFullYear()
}

export const formatLatamDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-')
  if (!year || !month || !day) return dateStr
  return `${day}-${month}`
}
