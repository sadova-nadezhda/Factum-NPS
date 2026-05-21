import type { PeriodFilter } from '../components/PeriodPicker/PeriodPicker'
import type { NpsRecord } from '../types'

export function applyPeriod(arr: NpsRecord[], p: PeriodFilter): NpsRecord[] {
  const now = new Date()
  let from: string | undefined
  let to: string | undefined

  if (p.type === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 7)
    from = d.toISOString().split('T')[0]
  } else if (p.type === 'this_month') {
    from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  } else if (p.type === 'last_month') {
    const f = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const t = new Date(now.getFullYear(), now.getMonth(), 0)
    from = f.toISOString().split('T')[0]
    to   = t.toISOString().split('T')[0]
  } else if (p.type === 'quarter') {
    const d = new Date(now); d.setMonth(d.getMonth() - 3)
    from = d.toISOString().split('T')[0]
  } else if (p.type === 'custom') {
    from = p.from; to = p.to
  }

  if (from) arr = arr.filter(r => r.date >= from!)
  if (to)   arr = arr.filter(r => r.date <= to!)
  return arr
}
