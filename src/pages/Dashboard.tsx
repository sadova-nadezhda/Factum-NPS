import React, { useState, useMemo, useEffect } from 'react'
import { clsx } from 'clsx'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { ScoreCircle, StatusBadge, ServiceTag, ScoreSelector, Button, SearchInput } from '../components/ui'
import { PeriodPicker } from '../components/PeriodPicker/PeriodPicker'
import type { PeriodFilter } from '../components/PeriodPicker/PeriodPicker'
import { RadioPicker } from '../components/RadioPicker/RadioPicker'
import { useStore, useStats } from '../hooks/store'
import type { NpsRecord } from '../types'
import s from './Dashboard.module.scss'

// ─── Types ───────────────────────────────────────────────────
type Tab     = 'overview' | 'responses' | 'managers'
type SortKey = 'date' | 'score'
type SortDir = 'asc' | 'desc'

const MONTHS = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']

const PAGE_SIZE = 50

// ─── NPS Gauge ───────────────────────────────────────────────
function NpsGauge({ score }: { score: number }) {
  const cx = 150, cy = 138, r = 116
  const clamp = Math.max(-100, Math.min(100, score))
  const toRad  = (d: number) => d * Math.PI / 180
  // Map score −100..+100 → angle 180°..0° (standard math)
  const angleDeg = (1 - (clamp + 100) / 200) * 180
  const sx = cx - r, sy = cy
  const ex = cx + r, ey = cy
  const px = cx + r * Math.cos(toRad(angleDeg))
  const py = cy - r * Math.sin(toRad(angleDeg))

  const bgPath   = `M ${sx} ${sy} A ${r} ${r} 0 0 1 ${ex} ${ey}`
  const fillPath = clamp > -100
    ? `M ${sx} ${sy} A ${r} ${r} 0 0 1 ${px.toFixed(1)} ${py.toFixed(1)}`
    : ''

  return (
    <svg viewBox="0 0 300 185" style={{ width: '100%', maxWidth: 300, margin: '0 auto', display: 'block' }}>
      <path d={bgPath} fill="none" stroke="#E2E8F0" strokeWidth="28" strokeLinecap="round" />
      {fillPath && (
        <path d={fillPath} fill="none" stroke="#1E3A5F" strokeWidth="28" strokeLinecap="round" />
      )}
      {/* 0 tick */}
      <line x1="150" y1="14" x2="150" y2="30" stroke="white" strokeWidth="5" />
      {/* Score */}
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize="56" fontWeight="700" fill="#0F172A" fontFamily="Onest, sans-serif">{score}</text>
      {/* Range labels */}
      <text x={sx - 2}  y={cy + 32} textAnchor="middle" fontSize="11" fill="#94A3B8">-100</text>
      <text x={ex + 2}  y={cy + 32} textAnchor="middle" fontSize="11" fill="#94A3B8">100</text>
    </svg>
  )
}

// ─── Stat Card ───────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  trend?: { pct: number; up: boolean } | null
}
function StatCard({ icon, label, value, trend }: StatCardProps) {
  return (
    <div className={s.statCard}>
      <div className={s.statTop}>
        <span className={s.statIcon}>{icon}</span>
        <span className={s.statLabel}>{label}</span>
      </div>
      <div className={s.statBottom}>
        <span className={s.statValue}>{value}</span>
        {trend != null && (
          <span className={clsx(s.trend, trend.up ? s.trendUp : s.trendDown)}>
            {trend.up ? '↑' : '↓'} {trend.pct}%
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Status Card ─────────────────────────────────────────────
function StatusCard({ received, waiting, unavailable }: { received: number; waiting: number; unavailable: number }) {
  return (
    <div className={s.statCard}>
      <div className={s.statTop}>
        <span className={s.statIcon}><IcoMsg /></span>
        <span className={s.statLabel}>Статусы</span>
      </div>
      <div className={s.statusBadges}>
        <span className={s.statusBadge} style={{ color: '#22C55E', borderColor: '#22C55E', background: '#F0FDF4' }}>Получено {received}</span>
        <span className={s.statusBadge} style={{ color: '#F59E0B', borderColor: '#F59E0B', background: '#FFFBEB' }}>Ожидаем {waiting}</span>
        <span className={s.statusBadge} style={{ color: '#EF4444', borderColor: '#EF4444', background: '#FEF2F2' }}>Недоступны {unavailable}</span>
      </div>
    </div>
  )
}

// ─── Donut legend row ─────────────────────────────────────────
function RespRow({ color, emoji, label, count, total }: {
  color: string; emoji: string; label: string; count: number; total: number
}) {
  const pct = total > 0 ? Math.round(count / total * 100) : 0
  return (
    <div className={s.respRow}>
      <span className={s.respEmoji}>{emoji}</span>
      <span className={s.respLabel}>{label}</span>
      <span className={s.respCount} style={{ color }}>
        {count.toLocaleString()} ({pct}%)
      </span>
    </div>
  )
}

// ─── SVG Icons ───────────────────────────────────────────────
const IcoEye     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const IcoMsg     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
const IcoTrend   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>

const IcoStar    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>

// ─── Main component ───────────────────────────────────────────
export default function Dashboard() {
  const { records, loading, updateRecord } = useStore()

  const [tab, setTab]                 = useState<Tab>('overview')
  const [period, setPeriod]           = useState<PeriodFilter>({ type: '' })
  const [segmentFilter, setSegment]       = useState('')
  const [companyFilter, setCompany]       = useState('')
  const [specialistFilter, setSpecialist] = useState('')

  // Responses-tab state
  const [query, setQuery]             = useState('')
  const [scoreFilter, setScoreFilter] = useState('')
  const [sortKey, setSortKey]         = useState<SortKey>('date')
  const [sortDir, setSortDir]         = useState<SortDir>('desc')
  const [page, setPage]               = useState(1)
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [editScore, setEditScore]     = useState<number | null>(null)
  const [editComment, setEditComment] = useState('')
  const [saving, setSaving]           = useState(false)

  const services     = useMemo(() => [...new Set(records.map(r => r.service).filter(Boolean))], [records])
  const companies    = useMemo(() => [...new Set(records.map(r => r.company).filter(Boolean))].sort(), [records])
  const specialists  = useMemo(() => [...new Set(records.map(r => r.specialist).filter(Boolean))].sort(), [records])

  // Helper: filter by PeriodFilter
  const applyPeriod = (arr: NpsRecord[], p: PeriodFilter) => {
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

  // Helper: previous period for trend comparison
  const getPrevRange = (p: PeriodFilter): { from: string; to: string } | null => {
    if (!p.type || p.type === 'custom') return null
    const now = new Date()
    if (p.type === 'week') {
      const curFrom = new Date(now); curFrom.setDate(curFrom.getDate() - 7)
      const prevTo  = new Date(curFrom); prevTo.setDate(prevTo.getDate() - 1)
      const prevFrom = new Date(prevTo); prevFrom.setDate(prevFrom.getDate() - 7)
      return { from: prevFrom.toISOString().split('T')[0], to: prevTo.toISOString().split('T')[0] }
    }
    if (p.type === 'this_month') {
      const f = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const t = new Date(now.getFullYear(), now.getMonth(), 0)
      return { from: f.toISOString().split('T')[0], to: t.toISOString().split('T')[0] }
    }
    if (p.type === 'last_month') {
      const f = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      const t = new Date(now.getFullYear(), now.getMonth() - 1, 0)
      return { from: f.toISOString().split('T')[0], to: t.toISOString().split('T')[0] }
    }
    if (p.type === 'quarter') {
      const curFrom = new Date(now); curFrom.setMonth(curFrom.getMonth() - 3)
      const prevTo  = new Date(curFrom); prevTo.setDate(prevTo.getDate() - 1)
      const prevFrom = new Date(prevTo); prevFrom.setMonth(prevFrom.getMonth() - 3)
      return { from: prevFrom.toISOString().split('T')[0], to: prevTo.toISOString().split('T')[0] }
    }
    return null
  }

  // Base filtered (period + segment + company + specialist)
  const filtered = useMemo(() => {
    let res = applyPeriod(records, period)
    if (segmentFilter)    res = res.filter(r => r.service    === segmentFilter)
    if (companyFilter)    res = res.filter(r => r.company    === companyFilter)
    if (specialistFilter) res = res.filter(r => r.specialist === specialistFilter)
    return res
  }, [records, period, segmentFilter, companyFilter, specialistFilter])

  // Previous period (for trend)
  const prevFiltered = useMemo(() => {
    const range = getPrevRange(period)
    if (!range) return []
    let res = records.filter(r => r.date >= range.from && r.date <= range.to)
    if (segmentFilter)    res = res.filter(r => r.service    === segmentFilter)
    if (companyFilter)    res = res.filter(r => r.company    === companyFilter)
    if (specialistFilter) res = res.filter(r => r.specialist === specialistFilter)
    return res
  }, [records, period, segmentFilter, companyFilter, specialistFilter])

  const stats     = useStats(filtered)
  const prevStats = useStats(prevFiltered)

  const trend = (cur: number, prev: number) => {
    if (!period.type || period.type === 'custom' || prevFiltered.length === 0 || prev === 0) return null
    const pct = Math.round(Math.abs((cur - prev) / prev) * 100)
    return { pct, up: cur >= prev }
  }

  // History: segment+company filtered, no period limit, last 12 months
  const historyData = useMemo(() => {
    const byMonth: Record<string, { p: number; pa: number; d: number; n: number }> = {}
    records
      .filter(r => r.score !== null)
      .filter(r => !segmentFilter || r.service === segmentFilter)
      .filter(r => !companyFilter || r.company === companyFilter)
      .forEach(r => {
        const ym = r.date.slice(0, 7)
        if (!byMonth[ym]) byMonth[ym] = { p: 0, pa: 0, d: 0, n: 0 }
        byMonth[ym].n++
        const sc = r.score ?? 0
        if (sc >= 9) byMonth[ym].p++
        else if (sc >= 7) byMonth[ym].pa++
        else byMonth[ym].d++
      })

    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([ym, d]) => {
        const [y, m] = ym.split('-')
        return {
          month: `${MONTHS[parseInt(m) - 1]} ${y.slice(2)}`,
          Промоутеры: d.p,
          Пассивы:    d.pa,
          Критики:    d.d,
          nps: d.n ? Math.round((d.p - d.d) / d.n * 100) : 0,
        }
      })
  }, [records, segmentFilter, companyFilter])

  const donutData = useMemo(() => [
    { name: 'Промоутеры', value: stats.promoters,  color: '#22C55E' },
    { name: 'Пассивы',    value: stats.passives,   color: '#CBD5E1' },
    { name: 'Критики',    value: stats.detractors, color: '#EF4444' },
  ].filter(d => d.value > 0), [stats])

  // ─── Managers tab ──────────────────────────────────────────
  const managersData = useMemo(() => {
    const map = new Map<string, { total: number; responded: number; promoters: number; passives: number; detractors: number; scoreSum: number; records: NpsRecord[] }>()
    filtered.forEach(r => {
      const key = r.specialist || '—'
      if (!map.has(key)) map.set(key, { total: 0, responded: 0, promoters: 0, passives: 0, detractors: 0, scoreSum: 0, records: [] })
      const m = map.get(key)!
      m.total++
      m.records.push(r)
      if (r.score !== null) {
        m.responded++
        m.scoreSum += r.score
        if (r.score >= 9) m.promoters++
        else if (r.score >= 7) m.passives++
        else m.detractors++
      }
    })
    return [...map.entries()]
      .map(([name, m]) => ({
        name,
        ...m,
        nps:  m.responded ? Math.round((m.promoters - m.detractors) / m.responded * 100) : null,
        avg:  m.responded ? (m.scoreSum / m.responded).toFixed(1) : null,
        rate: m.total ? Math.round(m.responded / m.total * 100) : 0,
      }))
      .sort((a, b) => (b.nps ?? -101) - (a.nps ?? -101))
  }, [filtered])

  // ─── Responses tab ─────────────────────────────────────────
  const tableFiltered = useMemo(() => {
    let res = [...filtered]
    if (query.trim()) {
      const q = query.toLowerCase()
      res = res.filter(r =>
        r.company.toLowerCase().includes(q) ||
        r.client.toLowerCase().includes(q) ||
        r.specialist.toLowerCase().includes(q)
      )
    }
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
  }, [filtered, query, scoreFilter, sortKey, sortDir])

  useEffect(() => { setPage(1) }, [query, scoreFilter, sortKey, sortDir, period, segmentFilter, companyFilter, specialistFilter])

  const totalPages = Math.max(1, Math.ceil(tableFiltered.length / PAGE_SIZE))
  const paginated  = tableFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const formatDate = (d: string) => {
    if (!d) return '—'
    const dt = new Date(d)
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const handleRowClick = (r: NpsRecord) => {
    if (expandedId === r.id) { setExpandedId(null); return }
    setExpandedId(r.id)
    setEditScore(r.score)
    setEditComment(r.comment ?? '')
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

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className={s.page}>

      {/* ── Fixed top: header + tabs + filters ── */}
      <div className={s.pageTop}>
        <div className={s.pageHeader}>
          <h1 className={s.pageTitle}>NPS</h1>
        </div>

        <div className={s.tabs}>
          {([['overview', 'Обзор'], ['responses', 'Ответы'], ['managers', 'Менеджеры']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} className={clsx(s.tab, tab === t && s.tabActive)} onClick={() => setTab(t)}>
              {label}
            </button>
          ))}
        </div>

        <div className={s.filters}>
          <RadioPicker
            value={segmentFilter}
            onChange={setSegment}
            options={services.map(sv => ({ value: sv, label: sv }))}
            placeholder="Услуга"
          />
          <RadioPicker
            value={companyFilter}
            onChange={setCompany}
            options={companies.map(c => ({ value: c, label: c }))}
            placeholder="Компания"
          />
          {/* <RadioPicker
            value={specialistFilter}
            onChange={setSpecialist}
            options={specialists.map(sp => ({ value: sp, label: sp }))}
            placeholder="Менеджер"
          /> */}
          <PeriodPicker value={period} onChange={setPeriod} />
          {(segmentFilter || companyFilter || specialistFilter || period.type) && (
            <button
              className={s.clearFiltersBtn}
              onClick={() => { setSegment(''); setCompany(''); setSpecialist(''); setPeriod({ type: '' }) }}
            >
              Сбросить
            </button>
          )}
        </div>
      </div>{/* end pageTop */}

      {/* ── Scrollable tab content ── */}
      <div className={s.tabContent}>

      {/* ══════════ OVERVIEW TAB ══════════ */}
      {tab === 'overview' && (
        <div className={s.overviewScroll}>
          {loading && (
            <div className={s.loadingBanner}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={s.loadingSpinner}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              Загрузка данных из Битрикс24…
            </div>
          )}
          {/* Stat cards */}
          <div className={s.statsRow}>
            <StatCard icon={<IcoEye />}   label="В работе"        value={stats.total.toLocaleString()}                      trend={trend(stats.total, prevStats.total)} />
            <StatCard icon={<IcoTrend />} label="Отклик на опрос" value={`${stats.responseRate}%`}                          trend={trend(stats.responseRate, prevStats.responseRate)} />
            <StatCard icon={<IcoStar />}  label="Средний балл"    value={stats.responded > 0 ? stats.avg : '—'}             trend={trend(Number(stats.avg), Number(prevStats.avg))} />
            <StatusCard received={stats.responded} waiting={stats.waiting} unavailable={stats.unavailable} />
          </div>

          {/* Score + Responses */}
          <div className={s.scoreResponseRow}>

            {/* Score gauge */}
            <div className={s.panel}>
              <div className={s.panelHead}>
                <span className={s.panelTitle}>Score</span>
                <span className={s.panelHint}>NPS = %Промоутеров − %Критиков</span>
              </div>
              <div className={s.gaugeWrap}>
                <NpsGauge score={stats.nps} />
              </div>
              <div className={s.gaugeFooter}>
                <span className={s.npsLabel} style={{ color: '#22C55E' }}>Промоутеры {stats.promoters}</span>
                <span className={s.npsLabel} style={{ color: '#94A3B8' }}>Пассивы {stats.passives}</span>
                <span className={s.npsLabel} style={{ color: '#EF4444' }}>Критики {stats.detractors}</span>
              </div>
            </div>

            {/* Donut */}
            <div className={s.panel}>
              <div className={s.panelHead}>
                <span className={s.panelTitle}>Ответы</span>
              </div>
              <div className={s.donutWrap}>
                <PieChart width={160} height={160}>
                  <Pie
                    data={donutData.length ? donutData : [{ name: '—', value: 1, color: '#E2E8F0' }]}
                    innerRadius={52}
                    outerRadius={76}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                  >
                    {(donutData.length ? donutData : [{ color: '#E2E8F0' }]).map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
                <div className={s.respList}>
                  <RespRow color="#22C55E" emoji="😊" label="Промоутеры" count={stats.promoters}  total={stats.responded} />
                  <RespRow color="#94A3B8" emoji="😐" label="Пассивы"    count={stats.passives}   total={stats.responded} />
                  <RespRow color="#EF4444" emoji="😞" label="Критики"    count={stats.detractors} total={stats.responded} />
                </div>
              </div>
            </div>
          </div>

          {/* History chart */}
          <div className={s.historyPanel}>
            <div className={s.panelHead}>
              <span className={s.panelTitle}>История NPS</span>
              <div className={s.histLegend}>
                <span><i className={s.dotBlack} /> Score</span>
                <span><i className={s.dotGreen} /> Промоутеры</span>
                <span><i className={s.dotGray}  /> Пассивы</span>
                <span><i className={s.dotRed}   /> Критики</span>
              </div>
            </div>
            {historyData.length === 0 ? (
              <div className={s.empty}>Нет данных за выбранный период</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={historyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="left"  tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={30} />
                  <YAxis yAxisId="right" orientation="right" domain={[-100, 100]} tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={{ fontSize: 13, borderRadius: 8, border: '1px solid #E2E8F0' }} />
                  <Bar yAxisId="left" dataKey="Промоутеры" stackId="a" fill="#22C55E" />
                  <Bar yAxisId="left" dataKey="Пассивы"    stackId="a" fill="#CBD5E1" />
                  <Bar yAxisId="left" dataKey="Критики"    stackId="a" fill="#EF4444" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="nps" stroke="#0F172A" strokeWidth={2}
                    dot={{ fill: '#0F172A', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* ══════════ RESPONSES TAB ══════════ */}
      {tab === 'responses' && (
        <div className={s.responseTab}>
          {/* Extra filters */}
          <div className={s.tableFilters}>
            <SearchInput
              placeholder="Поиск по компании, клиенту, специалисту..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <RadioPicker
              value={scoreFilter}
              onChange={setScoreFilter}
              placeholder="Оценка"
              align="right"
              options={[
                { value: 'low',  label: 'Низкий 1–6'  },
                { value: 'mid',  label: 'Средний 7–8'  },
                { value: 'high', label: 'Высокий 9–10' },
              ]}
            />
            {(query || scoreFilter) && (
              <button className={s.clearBtn} onClick={() => { setQuery(''); setScoreFilter('') }}>Сбросить</button>
            )}
          </div>

          <div className={s.tableCard}>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr className={s.thead}>
                    <th className={s.th}>
                      <button className={s.sortBtn} onClick={() => toggleSort('date')}>Дата ↕</button>
                    </th>
                    <th className={s.th}>Услуга</th>
                    <th className={s.th}>Специалист</th>
                    <th className={s.th}>Компания</th>
                    <th className={s.th}>Клиент</th>
                    <th className={s.th}>
                      <button className={s.sortBtn} onClick={() => toggleSort('score')}>Оценка ↕</button>
                    </th>
                    <th className={s.th}>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr><td colSpan={7} className={s.placeholder}>Загрузка из Битрикс24...</td></tr>
                  )}
                  {!loading && paginated.length === 0 && (
                    <tr><td colSpan={7} className={s.placeholder}>Нет записей</td></tr>
                  )}
                  {!loading && paginated.map(r => (
                    <React.Fragment key={r.id}>
                      <tr
                        className={clsx(s.row, expandedId === r.id && s.rowExpanded)}
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
                                  { label: 'Компания',   value: r.company },
                                  { label: 'Клиент',     value: r.client },
                                  { label: 'Телефон',    value: r.phone, phone: true },
                                  { label: 'Услуга',     value: r.service },
                                  { label: 'Специалист', value: r.specialist },
                                  { label: 'Дата',       value: formatDate(r.date) },
                                ].filter(f => f.value).map(f => (
                                  <div key={f.label} className={s.aField}>
                                    <span className={s.aLabel}>{f.label}</span>
                                    <span className={s.aValue}>
                                      {f.phone && f.value ? <a href={`tel:${f.value}`}>{f.value}</a> : f.value}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className={s.accordionSections}>
                                <div>
                                  <div className={s.aSecLabel}>Оценка NPS</div>
                                  <ScoreSelector value={editScore} onChange={setEditScore} />
                                  {editScore !== null && (
                                    <div className={s.scoreHint}>
                                      {editScore <= 6 && '⚠️ Критик — требует особого внимания'}
                                      {editScore >= 7 && editScore <= 8 && '😐 Пассив — нейтральная оценка'}
                                      {editScore >= 9 && '⭐ Промоутер — вероятно порекомендует'}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className={s.aSecLabel}>Комментарий</div>
                                  <textarea
                                    className={s.textarea}
                                    placeholder="Комментарий клиента..."
                                    value={editComment}
                                    onChange={e => setEditComment(e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className={s.accordionActions}>
                                <Button variant="secondary" onClick={() => handleNoDial(r)}>Не дозвонились</Button>
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
            <div className={s.tableFooter}>
              <span className={s.footerInfo}>
                {`Показано ${tableFiltered.length} из ${records.length} · Стр. ${page} / ${totalPages}`}
              </span>
              <div className={s.footerActions}>
                <button className={s.pageBtn} onClick={() => setPage(p => p - 1)} disabled={page === 1 || loading}>Назад</button>
                <button className={s.pageBtn} onClick={() => setPage(p => p + 1)} disabled={page >= totalPages || loading}>Вперёд</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MANAGERS TAB ══════════ */}
      {tab === 'managers' && (
        <div className={s.managersTab}>
          <div className={s.tableCard}>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr className={s.thead}>
                    <th className={s.th}>Менеджер</th>
                    <th className={s.th}>Компания / Проект</th>
                    <th className={s.th} style={{ textAlign: 'center' }}>Оценка</th>
                    <th className={s.th} style={{ textAlign: 'center' }}>Статус</th>
                    <th className={s.th}>Услуга</th>
                    <th className={s.th}>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {managersData.length === 0 && (
                    <tr><td colSpan={6} className={s.placeholder}>Нет данных</td></tr>
                  )}
                  {managersData.map(m => {
                    const npsColor = m.nps === null ? '#94A3B8' : m.nps >= 50 ? '#22C55E' : m.nps >= 0 ? '#F59E0B' : '#EF4444'
                    return (
                      <React.Fragment key={m.name}>
                        {/* Manager summary row */}
                        <tr className={s.mgrSummaryRow}>
                          <td colSpan={2} className={s.mgrSummaryName}>
                            {m.name}
                            <span className={s.mgrSummaryMeta}>
                              Всего {m.total} · Ответили {m.responded} · Отклик {m.rate}% · Ср. балл {m.avg ?? '—'}
                            </span>
                          </td>
                          <td className={s.mgrSummaryStats} colSpan={3}>
                            <span style={{ color: '#22C55E' }}>▲ {m.promoters} промоутер</span>
                            <span style={{ color: '#94A3B8' }}>● {m.passives} пассив</span>
                            <span style={{ color: '#EF4444' }}>▼ {m.detractors} критик</span>
                          </td>
                          <td colSpan={3} style={{ textAlign: 'right', paddingRight: 'calc(16 * var(--width-multiplier))' }}>
                            {m.nps !== null && (
                              <span className={s.npsChip} style={{ color: npsColor, borderColor: npsColor + '55', background: npsColor + '14' }}>
                                NPS {m.nps > 0 ? '+' : ''}{m.nps}
                              </span>
                            )}
                          </td>
                        </tr>
                        {/* Project rows */}
                        {m.records.map((r, i) => {
                          const sc = r.score
                          const rowBg = sc === null ? undefined : sc >= 9 ? '#F0FDF4' : sc >= 7 ? '#FFFBEB' : '#FEF2F2'
                          const scoreCol = sc === null ? 'var(--text-muted)' : sc >= 9 ? '#22C55E' : sc >= 7 ? '#F59E0B' : '#EF4444'
                          return (
                            <tr key={i} className={s.mgrProjectRow} style={rowBg ? { background: rowBg } : undefined}>
                              <td className={s.td} style={{ width: 'calc(200 * var(--width-multiplier))', paddingLeft: 'calc(32 * var(--width-multiplier))' }}></td>
                              <td className={s.tdBold}>{r.company || r.client || '—'}</td>
                              <td className={s.td} style={{ textAlign: 'center' }}>
                                {sc !== null
                                  ? <strong style={{ color: scoreCol, fontSize: 'calc(15 * var(--width-multiplier))' }}>{sc}</strong>
                                  : <span style={{ color: 'var(--text-muted)' }}>—</span>
                                }
                              </td>
                              <td className={s.td} style={{ textAlign: 'center' }}><StatusBadge status={r.status} /></td>
                              <td className={s.td}><ServiceTag service={r.service} /></td>
                              <td className={s.td}>{formatDate(r.date)}</td>
                            </tr>
                          )
                        })}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      </div>{/* end tabContent */}
    </div>
  )
}
