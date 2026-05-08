import React, { useState, useMemo, useEffect } from 'react'
import { clsx } from 'clsx'
import { ScoreCircle, StatusBadge, ServiceTag, Card, ScoreSelector, Button } from '../components/ui'
import type { PeriodFilter } from '../components/PeriodPicker/PeriodPicker'
import { RecordFilters } from '../components/RecordFilters/RecordFilters'
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
  const { records, loading, updateRecord } = useStore()

  const [query, setQuery]               = useState('')
  const [period, setPeriod]             = useState<PeriodFilter>({ type: '' })
  const [serviceFilter, setServiceFilter] = useState('')
  const [scoreFilter, setScoreFilter]   = useState('')
  const [sortKey, setSortKey]           = useState<SortKey>('date')
  const [sortDir, setSortDir]           = useState<SortDir>('desc')
  const [page, setPage]                 = useState(1)
  const [expandedId, setExpandedId]     = useState<string | null>(null)
  const [editScore, setEditScore]       = useState<number | null>(null)
  const [editComment, setEditComment]   = useState('')
  const [saving, setSaving]             = useState(false)

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

  const handleRowClick = (r: NpsRecord) => {
    if (expandedId === r.id) {
      setExpandedId(null)
    } else {
      setExpandedId(r.id)
      setEditScore(r.score)
      setEditComment(r.comment ?? '')
    }
  }

  const handleSave = async (r: NpsRecord) => {
    setSaving(true)
    await updateRecord(r.id, {
      score: editScore,
      comment: editComment,
      status: editScore !== null ? 'received' : 'waiting',
      called: editScore !== null,
    })
    setSaving(false)
    setExpandedId(null)
  }

  const handleNoDial = async (r: NpsRecord) => {
    await updateRecord(r.id, { status: 'unavailable', called: true })
    setExpandedId(null)
  }

  return (
    <div className={s.page}>
      <div className='container'>

        <div className={s.stats}>
          <Card className={s.statsCard}>
            <div className={s.statLabel}>ОТКЛИК НА ОПРОС</div>
            <div className={s.statValue}>{stats.responseRate}%</div>
            <div className={s.statBarWrap}>
              <div className={s.statBarFill} style={{ width: `${stats.responseRate}%` }} />
            </div>
            <div className={s.statMeta}>{stats.responded} из {stats.total} ответили</div>
          </Card>

          <Card className={s.statsCard}>
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

          <Card className={s.statsCard}>
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
                    Дата <span className={s.sortIcon}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.66675 2.66663V13.3333" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M11.3333 12.6666V2.66663" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6.66675 4.66661C6.66675 4.66661 5.19377 2.66663 4.66673 2.66663C4.13969 2.66662 2.66675 4.66663 2.66675 4.66663" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.3333 11.3334C13.3333 11.3334 11.8603 13.3334 11.3333 13.3334C10.8062 13.3334 9.33325 11.3334 9.33325 11.3334" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                  </button>
                </th>
                <th className={s.th}>Услуга</th>
                <th className={s.th}>Специалист</th>
                <th className={s.th}>Компания</th>
                <th className={s.th}>Клиент</th>
                <th className={s.th}>
                  <button className={s.sortBtn} onClick={() => toggleSort('score')}>
                    Оценка <span className={s.sortIcon}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.66675 2.66663V13.3333" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M11.3333 12.6666V2.66663" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6.66675 4.66661C6.66675 4.66661 5.19377 2.66663 4.66673 2.66663C4.13969 2.66662 2.66675 4.66663 2.66675 4.66663" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.3333 11.3334C13.3333 11.3334 11.8603 13.3334 11.3333 13.3334C10.8062 13.3334 9.33325 11.3334 9.33325 11.3334" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
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
                <React.Fragment key={r.id}>
                  <tr
                    className={clsx(s.rowClickable, expandedId === r.id && s.rowExpanded)}
                    onClick={() => handleRowClick(r)}
                  >
                    <td className={s.td}>{formatDate(r.date)}</td>
                    <td className={s.td}><ServiceTag service={r.service} /></td>
                    <td className={s.td}>{r.specialist || '—'}</td>
                    <td className={s.tdBold}>{r.company || '—'}</td>
                    <td className={s.td}>{r.client || '—'}</td>
                    <td className={s.td}><ScoreCircle score={r.score} /></td>
                    <td className={s.td}><StatusBadge status={r.status} /></td>
                  </tr>
                  {expandedId === r.id && (
                    <tr className={s.accordionRow}>
                      <td colSpan={7} className={s.accordionCell} onClick={e => e.stopPropagation()}>
                        <div className={s.accordion}>
                          <div className={s.accordionGrid}>
                            {[
                              { label: 'Компания',      value: r.company },
                              { label: 'Клиент',        value: r.client },
                              { label: 'Телефон',       value: r.phone,      phone: true },
                              { label: 'Услуга',        value: r.service },
                              { label: 'Специалист',    value: r.specialist },
                              { label: 'Дата',          value: formatDate(r.date) },
                            ].filter(f => f.value).map(f => (
                              <div key={f.label} className={s.accordionField}>
                                <span className={s.accordionFieldLabel}>{f.label}</span>
                                <span className={s.accordionFieldValue}>
                                  {f.phone && f.value
                                    ? <a href={`tel:${f.value}`}>{f.value}</a>
                                    : f.value || '—'}
                                </span>
                              </div>
                            ))}
                          </div>

                          <div className={s.accordionSections}>
                            <div className={s.accordionSection}>
                              <div className={s.accordionSectionLabel}>Оценка NPS</div>
                              <ScoreSelector value={editScore} onChange={setEditScore} />
                              {editScore !== null && (
                                <div className={s.scoreHint}>
                                  {editScore <= 6 && '⚠️ Критик — требует особого внимания'}
                                  {editScore >= 7 && editScore <= 8 && '😐 Пассив — нейтральная оценка'}
                                  {editScore >= 9 && '⭐ Промоутер — вероятно порекомендует'}
                                </div>
                              )}
                            </div>

                            <div className={s.accordionSection}>
                              <div className={s.accordionSectionLabel}>Комментарий</div>
                              <textarea
                                className={s.accordionTextarea}
                                placeholder="Комментарий клиента..."
                                value={editComment}
                                onChange={e => setEditComment(e.target.value)}
                              />
                            </div>
                          </div>

                          <div className={s.accordionActions}>
                            <Button variant="secondary" onClick={() => handleNoDial(r)}>
                              Не дозвонились
                            </Button>
                            <Button variant="primary" onClick={() => handleSave(r)} disabled={saving}>
                              {saving ? 'Сохранение...' : 'Сохранить'}
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
  )
}
