import React, { useMemo, useState } from 'react'
import { useStore } from '../hooks/store'
import { ServiceTag, SearchInput } from '../components/ui'
import { npsColor } from '../utils/nps'
import s from './Projects.module.scss'

export default function Projects() {
  const { records } = useStore()
  const [query, setQuery] = useState('')

  const projects = useMemo(() => {
    const map = new Map<string, {
      company: string; services: Set<string>; total: number
      promoters: number; passives: number; detractors: number; responded: number
    }>()

    records.forEach(r => {
      const key = r.company
      if (!map.has(key)) {
        map.set(key, { company: r.company, services: new Set(), total: 0, promoters: 0, passives: 0, detractors: 0, responded: 0 })
      }
      const p = map.get(key)!
      p.total++
      if (r.service) p.services.add(r.service)
      if (r.score !== null) {
        p.responded++
        if (r.score >= 9) p.promoters++
        else if (r.score >= 7) p.passives++
        else p.detractors++
      }
    })

    return [...map.values()]
      .map(p => ({
        ...p,
        services: [...p.services],
        nps: p.responded ? Math.round((p.promoters - p.detractors) / p.responded * 100) : null,
      }))
      .sort((a, b) => b.total - a.total)
  }, [records])

  const filtered = useMemo(() => {
    if (!query.trim()) return projects
    const q = query.toLowerCase()
    return projects.filter(p => p.company.toLowerCase().includes(q))
  }, [projects, query])

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Проекты</h1>
        <span className={s.count}>{projects.length}</span>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Поиск по компании..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className={s.grid}>
        {filtered.length === 0 && (
          <div className={s.empty}>Нет проектов</div>
        )}
        {filtered.map((p, i) => (
          <div key={i} className={s.card}>
            <div className={s.cardTop}>
              <span className={s.company}>{p.company || '—'}</span>
              {p.nps !== null && (
                <span className={s.npsTag} style={{ color: npsColor(p.nps), borderColor: npsColor(p.nps) + '33', background: npsColor(p.nps) + '12' }}>
                  NPS {p.nps > 0 ? '+' : ''}{p.nps}
                </span>
              )}
            </div>

            <div className={s.services}>
              {p.services.map(sv => <ServiceTag key={sv} service={sv} />)}
            </div>

            <div className={s.metrics}>
              <div className={s.metric}>
                <span className={s.metricVal}>{p.total}</span>
                <span className={s.metricLabel}>Всего</span>
              </div>
              <div className={s.metric}>
                <span className={s.metricVal}>{p.responded}</span>
                <span className={s.metricLabel}>Ответили</span>
              </div>
              <div className={s.metric}>
                <span className={s.metricVal} style={{ color: '#22C55E' }}>{p.promoters}</span>
                <span className={s.metricLabel}>Промоут.</span>
              </div>
              <div className={s.metric}>
                <span className={s.metricVal} style={{ color: '#EF4444' }}>{p.detractors}</span>
                <span className={s.metricLabel}>Критики</span>
              </div>
            </div>

            {p.responded > 0 && (
              <div className={s.bar}>
                {p.promoters  > 0 && <div className={s.barGreen}  style={{ flex: p.promoters  }} />}
                {p.passives   > 0 && <div className={s.barGray}   style={{ flex: p.passives   }} />}
                {p.detractors > 0 && <div className={s.barRed}    style={{ flex: p.detractors }} />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
