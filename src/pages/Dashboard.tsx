import React, { useState, useMemo, useEffect } from 'react'
import { ScoreCircle, StatusBadge, ServiceTag, Card } from '../components/ui'
import type { PeriodFilter } from '../components/PeriodPicker/PeriodPicker'
import { RecordFilters } from '../components/RecordFilters/RecordFilters'
import ProjectModal from '../components/ProjectModal/ProjectModal'
import { useStore, useStats } from '../hooks/store'
import type { NpsRecord } from '../types'
import s from './Dashboard.module.scss'

const PAGE_SIZE = 50

type SortKey = 'date' | 'score'
type SortDir = 'asc' | 'desc'

const SCORE_OPTIONS = [
  { value: 'low',  label: 'Низкий 0-6' },
  { value: 'mid',  label: 'Средний 7-8' },
  { value: 'high', label: 'Высокий 9-10' },
]

export default function Dashboard() {
  const { records, loading } = useStore()

  const [query, setQuery]               = useState('')
  const [period, setPeriod]             = useState<PeriodFilter>({ type: '' })
  const [serviceFilter, setServiceFilter] = useState('')
  const [scoreFilter, setScoreFilter]   = useState('')
  const [sortKey, setSortKey]           = useState<SortKey>('date')
  const [sortDir, setSortDir]           = useState<SortDir>('desc')
  const [page, setPage]                 = useState(1)
  const [selected, setSelected]         = useState<NpsRecord | null>(null)

  const availableServices = useMemo(
    () => [...new Set(records.map(r => r.service).filter(Boolean))],
    [records]
  )

  const filtered = useMemo(() => {
    let res = [...records]

    if (query.trim()) {
      const q = query.toLowerCase()
      res = res.filter(r =>
        r.company.toLowerCase().includes(q) ||
        r.client.toLowerCase().includes(q) ||
        r.specialist.toLowerCase().includes(q)
      )
    }

    if (period.type) {
      const now = new Date()
      let from: string | undefined
      let to: string | undefined

      if (period.type === 'week') {
        const d = new Date(now); d.setDate(d.getDate() - 7)
        from = d.toISOString().split('T')[0]
        to   = now.toISOString().split('T')[0]
      } else if (period.type === 'this_month') {
        from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        to   = now.toISOString().split('T')[0]
      } else if (period.type === 'last_month') {
        const f = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const t = new Date(now.getFullYear(), now.getMonth(), 0)
        from = f.toISOString().split('T')[0]
        to   = t.toISOString().split('T')[0]
      } else if (period.type === 'quarter') {
        const d = new Date(now); d.setMonth(d.getMonth() - 3)
        from = d.toISOString().split('T')[0]
        to   = now.toISOString().split('T')[0]
      } else if (period.type === 'custom') {
        from = period.from
        to   = period.to
      }

      if (from) res = res.filter(r => r.date >= from!)
      if (to)   res = res.filter(r => r.date <= to!)
    }

    if (serviceFilter) res = res.filter(r => r.service === serviceFilter)

    if (scoreFilter === 'low')  res = res.filter(r => r.score !== null && r.score <= 6)
    if (scoreFilter === 'mid')  res = res.filter(r => r.score !== null && r.score >= 7 && r.score <= 8)
    if (scoreFilter === 'high') res = res.filter(r => r.score !== null && r.score >= 9)

    res.sort((a, b) => {
      const cmp = sortKey === 'date'
        ? (a.date ?? '').localeCompare(b.date ?? '')
        : (a.score ?? -1) - (b.score ?? -1)
      return sortDir === 'asc' ? cmp : -cmp
    })

    return res
  }, [records, query, period, serviceFilter, scoreFilter, sortKey, sortDir])

  const stats = useStats(filtered)

  useEffect(() => { setPage(1) }, [query, period, serviceFilter, scoreFilter, sortKey, sortDir])

  const totalPages     = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasFilters     = !!(query || period.type || serviceFilter || scoreFilter)

  const clearFilters = () => {
    setQuery('')
    setPeriod({ type: '' })
    setServiceFilter('')
    setScoreFilter('')
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const formatDate = (d: string) => {
    if (!d) return '—'
    const dt = new Date(d)
    return Number.isNaN(dt.getTime())
      ? '—'
      : dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const npsTotal = stats.low + stats.mid + stats.high || 1

  return (
    <>
    <div className={s.page}>
      <div className='container'>

        <div className={s.stats}>
          <Card style={{ padding: 'calc(20 * var(--width-multiplier, 1))' }}>
            <div className={s.statLabel}>ОТКЛИК НА ОПРОС</div>
            <div className={s.statValue}>{stats.responseRate}%</div>
            <div className={s.statBarWrap}>
              <div className={s.statBarFill} style={{ width: `${stats.responseRate}%` }} />
            </div>
            <div className={s.statMeta}>{stats.responded} из {stats.total} ответили</div>
          </Card>

          <Card style={{ padding: 'calc(20 * var(--width-multiplier, 1))' }}>
            <div className={s.statLabel}>NPS</div>
            <div className={s.statValue}>{stats.avg}</div>
            <div className={s.npsBarWrap}>
              {stats.low  > 0 && <div className={s.npsSegRed}   style={{ flex: stats.low  / npsTotal }} />}
              {stats.mid  > 0 && <div className={s.npsSegAmber} style={{ flex: stats.mid  / npsTotal }} />}
              {stats.high > 0 && <div className={s.npsSegGreen} style={{ flex: stats.high / npsTotal }} />}
            </div>
            <div className={s.npsLegend}>
              <span><i className={s.dotRed}   />Низкий — {stats.low}</span>
              <span><i className={s.dotAmber} />Средний — {stats.mid}</span>
              <span><i className={s.dotGreen} />Высокий — {stats.high}</span>
            </div>
          </Card>

          <Card style={{ padding: 'calc(20 * var(--width-multiplier, 1))' }}>
            <div className={s.statLabel}>В РАБОТЕ</div>
            <div className={s.statValue}>{stats.total}</div>
            <div className={s.statBadges}>
              <span className={s.statBadgeGreen}>Получено <strong>{stats.responded}</strong></span>
              <span className={s.statBadgeAmber}>Ожидаем ответа <strong>{stats.waiting}</strong></span>
              <span className={s.statBadgeRed}>Недоступны <strong>{stats.unavailable}</strong></span>
            </div>
          </Card>
        </div>

        <RecordFilters
          query={query}
          onQueryChange={setQuery}
          period={period}
          onPeriodChange={setPeriod}
          serviceFilter={serviceFilter}
          onServiceFilterChange={setServiceFilter}
          services={availableServices}
          scoreFilter={scoreFilter}
          onScoreFilterChange={setScoreFilter}
          scoreOptions={SCORE_OPTIONS}
          hasFilters={hasFilters}
          onClearFilters={clearFilters}
        />

        <Card style={{ overflow: 'hidden' }}>
          <div className={s.tableWrap}>
          <table className={s.table}>
            <thead className={s.thead}>
              <tr>
                <th className={s.th}>
                  <button className={s.sortBtn} onClick={() => toggleSort('date')}>
                    Дата <span className={s.sortIcon}>{sortKey === 'date' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                  </button>
                </th>
                <th className={s.th}>Услуга</th>
                <th className={s.th}>Специалист</th>
                <th className={s.th}>Компания</th>
                <th className={s.th}>Клиент</th>
                <th className={s.th}>
                  <button className={s.sortBtn} onClick={() => toggleSort('score')}>
                    Оценка <span className={s.sortIcon}>{sortKey === 'score' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
                  </button>
                </th>
                <th className={s.th}>Статус</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className={s.placeholder}>Загрузка проектов из Битрикс24...</td></tr>
              )}
              {!loading && paginated.length === 0 && (
                <tr><td colSpan={7} className={s.placeholder}>Нет записей</td></tr>
              )}
              {!loading && paginated.map(r => (
                <tr key={r.id} className={s.rowClickable} onClick={() => setSelected(r)}>
                  <td className={s.td}>{formatDate(r.date)}</td>
                  <td className={s.td}><ServiceTag service={r.service} /></td>
                  <td className={s.td}>{r.specialist || '—'}</td>
                  <td className={s.tdBold}>{r.company || '—'}</td>
                  <td className={s.td}>{r.client || '—'}</td>
                  <td className={s.td}><ScoreCircle score={r.score} /></td>
                  <td className={s.td}><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className={s.footer}>
            <div className={s.footerInfo}>
              {hasFilters
                ? `Показано ${filtered.length} из ${records.length} · Страница ${page} из ${totalPages}`
                : `Страница ${page} из ${totalPages} · Всего проектов: ${records.length}`}
            </div>
            <div className={s.footerActions}>
              <button type="button" className={s.paginationBtn} onClick={() => setPage(p => p - 1)} disabled={page === 1 || loading}>Назад</button>
              <button type="button" className={s.paginationBtn} onClick={() => setPage(p => p + 1)} disabled={page >= totalPages || loading}>Вперед</button>
            </div>
          </div>
        </Card>

      </div>
    </div>

    <ProjectModal record={selected} onClose={() => setSelected(null)} />
    </>
  )
}
