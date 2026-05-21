export function formatDate(d: string, month: 'short' | 'long' = 'short'): string {
  if (!d) return '—'
  const dt = new Date(d + 'T00:00:00')
  if (isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('ru-RU', { day: 'numeric', month, year: 'numeric' })
}
