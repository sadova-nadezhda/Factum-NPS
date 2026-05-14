import { useState, useMemo, useEffect } from 'react'
import { clsx } from 'clsx'
import { ScoreSelector, ScoreCircle, StatusBadge, Card } from '../components/ui'
import type { PeriodFilter } from '../components/PeriodPicker/PeriodPicker'
import { RecordFilters } from '../components/RecordFilters/RecordFilters'
import { useStore } from '../hooks/store'
import s from './Calls.module.scss'

const PAGE_SIZE = 50

type FieldDef = {
  label: string
  value: string | undefined
  bold?: boolean
  mono?: boolean
  link?: boolean
}

export default function Calls() {
  const { records, loading, updateRecord } = useStore()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [score, setScore]           = useState<number | null>(null)
  const [comment, setComment]       = useState('')
  const [saving, setSaving]         = useState(false)
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const [page, setPage]             = useState(1)
  const [query, setQuery]           = useState('')
  const [period, setPeriod]         = useState<PeriodFilter>({ type: '' })
  const [serviceFilter, setServiceFilter] = useState('')

  const availableServices = useMemo(
    () => [...new Set(records.filter(r => !r.called).map(r => r.service).filter(Boolean))],
    [records]
  )

  const queue = useMemo(() => {
    let res = records.filter(r => !r.called)

    if (query.trim()) {
      const q = query.toLowerCase()
      res = res.filter(r =>
        (r.company || '').toLowerCase().includes(q) ||
        (r.client || '').toLowerCase().includes(q) ||
        (r.specialist || '').toLowerCase().includes(q)
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

    return res
  }, [records, query, period, serviceFilter])

  const hasFilters = !!(query || period.type || serviceFilter)

  const clearFilters = () => {
    setQuery('')
    setPeriod({ type: '' })
    setServiceFilter('')
  }

  useEffect(() => { setPage(1); setSelectedId(null) }, [query, period, serviceFilter])

  const totalRecords = records.filter(r => !r.called).length
  const totalPages = Math.max(1, Math.ceil(queue.length / PAGE_SIZE))
  const pageQueue  = queue.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const selected   = queue.find(r => r.id === selectedId) ?? null

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setScore(null)
    setComment('')
    setSheetExpanded(false)
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    await updateRecord(selected.id, {
      score,
      comment,
      status: score !== null ? 'received' : 'waiting',
      called: true,
    })
    setSaving(false)
    setSelectedId(null)
    setScore(null)
    setComment('')
  }

  const handleNoDial = async () => {
    if (!selected) return
    await updateRecord(selected.id, { status: 'unavailable' })
    setSelectedId(null)
  }

  const changePage = (next: number) => {
    setPage(next)
    setSelectedId(null)
  }

  if (loading) {
    return (
      <div className={s.page}>
        <div className='container'>
          <Card>
            <div className={s.emptyCard}>
              <div className={s.emptyIcon}>⏳</div>
              <div className={s.emptyTitle}>Загружаем карточки проектов</div>
              <div className={s.emptyDesc}>Берем проектные воронки: Web, ADS, SEO, Target, SMM.</div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (totalRecords === 0) {
    return (
      <div className={s.page}>
        <div className='container'>
          <Card>
            <div className={s.emptyCard}>
              <div className={s.emptyIcon}>✅</div>
              <div className={s.emptyTitle}>Все клиенты обзвонены</div>
              <div className={s.emptyDesc}>Очередь обзвона пуста.</div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  const fields: FieldDef[] = [
    { label: 'Проект',        value: selected?.project },
    { label: 'Клиент',        value: selected?.client },
    { label: 'Телефон',       value: selected?.phone,     mono: true, link: true },
    { label: 'Услуга',        value: selected?.service },
    { label: 'Ответственный', value: selected?.specialist },
  ]

  return (
    <div className={s.page}>
      <div className='container'>
        <RecordFilters
          query={query}
          onQueryChange={setQuery}
          period={period}
          onPeriodChange={setPeriod}
          serviceFilter={serviceFilter}
          onServiceFilterChange={setServiceFilter}
          services={availableServices}
          hasFilters={hasFilters}
          onClearFilters={clearFilters}
        />

        <div className={s.layout}>
          <Card style={{ overflow: 'hidden' }}>
            <div className={s.queueHeader}>
              <div>
                <div className={s.queueTitle}>Очередь обзвона</div>
                <div className={s.queueSubtitle}>
                  {hasFilters
                    ? `Показано ${queue.length} из ${totalRecords} · Страница ${page} из ${totalPages}`
                    : `Страница ${page} из ${totalPages} · Всего: ${totalRecords}`}
                </div>
              </div>
              <span className={s.queueBadge}>{queue.length} карточек</span>
            </div>

            {queue.length === 0 ? (
              <div className={s.emptyCard}>
                <div className={s.emptyIcon}>🔍</div>
                <div className={s.emptyTitle}>Ничего не найдено</div>
                <div className={s.emptyDesc}>Попробуйте изменить фильтры или сбросить поиск.</div>
              </div>
            ) : pageQueue.map(r => {
              const active = r.id === selectedId
              return (
                <div
                  key={r.id}
                  onClick={() => handleSelect(r.id)}
                  className={clsx(s.queueItem, active && s.active)}
                >
                  <div>
                    <div className={s.itemTitle}>{r.project || r.company || 'Без названия'}</div>
                    <div className={s.itemClient}>
                      {r.client || 'Клиент не указан'}
                      {r.company ? ` — ${r.company}` : ''}
                    </div>
                    <div className={s.itemMeta}>
                      {r.service || '—'} · {r.specialist || '—'}
                    </div>
                  </div>
                  {r.score !== null ? (
                    <ScoreCircle score={r.score} />
                  ) : (
                    <StatusBadge status={r.status} />
                  )}
                </div>
              )
            })}

            <div className={s.queueFooter}>
              <div className={s.footerInfo}>Показано {pageQueue.length} из {queue.length}</div>
              <div className={s.footerActions}>
                <button type="button" className={s.paginationBtn} onClick={() => changePage(page - 1)} disabled={page === 1}>Назад</button>
                <button type="button" className={s.paginationBtn} onClick={() => changePage(page + 1)} disabled={page >= totalPages}>Вперед</button>
              </div>
            </div>
          </Card>

          <div className={clsx(s.sidebarWrapper, selected && s.mobileVisible, selected && sheetExpanded && s.expanded)}>
            <Card className={s.sidebar}>
              {selected ? (
                <>
                  <div className={s.sheetHandle} onClick={() => setSheetExpanded(v => !v)}>
                    <div className={s.handlePill} />
                    <div className={s.handleInfo}>
                      <div className={s.handleName}>{selected.client || selected.company || 'Клиент'}</div>
                      <div className={s.handleSub}>{selected.phone || selected.service || ''}</div>
                    </div>
                    <svg className={clsx(s.handleChevron, sheetExpanded && s.chevronUp)} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </div>
                  <div className={s.sidebarBody}>
                    <div>
                      <div className={s.sidebarLabel}>Карточка проекта</div>
                      {fields.map(({ label, value, bold, mono, link }) => (
                        <div key={label} className={s.fieldRow}>
                          <span className={s.fieldLabel}>{label}</span>
                          <span className={clsx(
                            bold ? s.fieldValueBold : mono ? s.fieldValueMono : link ? s.fieldValueLink : s.fieldValue
                          )}>
                            {link && value ? <a href={`tel:${value}`}>{value}</a> : value || '—'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {selected.score !== null && (
                      <div className={s.prevBlock}>
                        <div className={s.sidebarLabel}>Предыдущая оценка</div>
                        <div className={s.prevScore}>
                          <ScoreCircle score={selected.score} />
                          <span className={s.prevScoreHint}>
                            {selected.score <= 6 ? 'Критик' : selected.score <= 8 ? 'Пассив' : 'Промоутер'}
                          </span>
                        </div>
                        {selected.comment?.trim() && (
                          <div className={s.prevComment}>{selected.comment.trim()}</div>
                        )}
                      </div>
                    )}

                    <div>
                      <div className={s.sidebarLabel}>Оценка NPS</div>
                      <ScoreSelector value={score} onChange={setScore} />
                      {score !== null && (
                        <div className={s.scoreHint}>
                          {score <= 6 && '⚠️ Критик — требует внимания руководителя'}
                          {score >= 7 && score <= 8 && '😐 Пассив — нейтральная оценка'}
                          {score >= 9 && '⭐ Промоутер — порекомендует нас'}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className={s.sidebarLabel}>Комментарий</div>
                      <textarea
                        placeholder="Заметка по звонку..."
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        className={s.textarea}
                      />
                    </div>

                    <div className={s.actions}>
                      <button type="button" className={s.btnNoDial} onClick={handleNoDial}>
                        Не дозвонились
                      </button>
                      <button type="button" className={s.btnSave} onClick={handleSave} disabled={saving}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                          <polyline points="17 21 17 13 7 13 7 21" />
                          <polyline points="7 3 7 8 15 8" />
                        </svg>
                        {saving ? 'Сохранение...' : 'Сохранить оценку'}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className={s.emptySelect}>
                  <div className={s.emptySelectIcon}>👆</div>
                  Выберите карточку проекта из списка
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
      {selected && sheetExpanded && (
        <div className={s.backdrop} onClick={() => setSheetExpanded(false)} />
      )}
    </div>
  )
}
