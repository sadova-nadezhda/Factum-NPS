import React, { useMemo, useState } from 'react'
import { useStore } from '../hooks/store'
import { ScoreCircle, StatusBadge, ServiceTag, SearchInput } from '../components/ui'
import s from './Clients.module.scss'

export default function Clients() {
  const { records } = useStore()
  const [query, setQuery] = useState('')

  const clients = useMemo(() => {
    const map = new Map<string, {
      company: string; client: string; phone: string; service: string
      scores: number[]; lastDate: string; count: number; lastScore: number | null
    }>()

    records.forEach(r => {
      const key = `${r.company}||${r.client}`
      const existing = map.get(key)
      if (!existing) {
        map.set(key, {
          company: r.company, client: r.client, phone: r.phone, service: r.service,
          scores: r.score !== null ? [r.score] : [],
          lastDate: r.date, count: 1, lastScore: r.score,
        })
      } else {
        if (r.score !== null) existing.scores.push(r.score)
        if (r.date > existing.lastDate) {
          existing.lastDate = r.date
          existing.lastScore = r.score
        }
        existing.count++
      }
    })

    return [...map.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate))
  }, [records])

  const filtered = useMemo(() => {
    if (!query.trim()) return clients
    const q = query.toLowerCase()
    return clients.filter(c =>
      c.company.toLowerCase().includes(q) ||
      c.client.toLowerCase().includes(q) ||
      c.phone.includes(q)
    )
  }, [clients, query])

  const formatDate = (d: string) => {
    if (!d) return '—'
    const dt = new Date(d)
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Клиенты</h1>
        <span className={s.count}>{clients.length}</span>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Поиск по компании, клиенту или телефону..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr className={s.thead}>
              <th className={s.th}>Компания</th>
              <th className={s.th}>Клиент</th>
              <th className={s.th}>Телефон</th>
              <th className={s.th}>Услуга</th>
              <th className={s.th}>Последняя оценка</th>
              <th className={s.th}>Дата</th>
              <th className={s.th}>Записей</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className={s.empty}>Нет клиентов</td></tr>
            )}
            {filtered.map((c, i) => (
              <tr key={i} className={s.row}>
                <td className={s.tdBold}>{c.company || '—'}</td>
                <td className={s.td}>{c.client || '—'}</td>
                <td className={s.td}>
                  {c.phone ? <a href={`tel:${c.phone}`} className={s.phone}>{c.phone}</a> : '—'}
                </td>
                <td className={s.td}><ServiceTag service={c.service} /></td>
                <td className={s.td}><ScoreCircle score={c.lastScore} /></td>
                <td className={s.td}>{formatDate(c.lastDate)}</td>
                <td className={s.td}>{c.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
