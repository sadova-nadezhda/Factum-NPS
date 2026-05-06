import React from 'react'
import { Card } from '../ui'
import { PeriodPicker } from '../PeriodPicker/PeriodPicker'
import type { PeriodFilter } from '../PeriodPicker/PeriodPicker'
import { RadioPicker } from '../RadioPicker/RadioPicker'
import s from './RecordFilters.module.scss'

type Option = { value: string; label: string }

type Props = {
  query: string
  onQueryChange: (v: string) => void
  period: PeriodFilter
  onPeriodChange: (v: PeriodFilter) => void
  serviceFilter: string
  onServiceFilterChange: (v: string) => void
  services: string[]
  scoreFilter?: string
  onScoreFilterChange?: (v: string) => void
  scoreOptions?: Option[]
  hasFilters: boolean
  onClearFilters: () => void
}

export function RecordFilters({
  query, onQueryChange,
  period, onPeriodChange,
  serviceFilter, onServiceFilterChange,
  services,
  scoreFilter, onScoreFilterChange, scoreOptions,
  hasFilters, onClearFilters,
}: Props) {
  return (
    <Card style={{ padding: 'calc(20 * var(--width-multiplier, 1))', marginBottom: 'calc(16 * var(--width-multiplier, 1))' }}>
      <div className={s.searchWrap}>
        <svg className={s.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          className={s.searchInput}
          placeholder="Поиск по компании, клиенту или специалисту..."
          value={query}
          onChange={e => onQueryChange(e.target.value)}
        />
      </div>
      <div className={s.filterRow}>
        <span className={s.filterLabel}>ФИЛЬТР</span>
        <PeriodPicker value={period} onChange={onPeriodChange} />
        <RadioPicker
          value={serviceFilter}
          onChange={onServiceFilterChange}
          options={services.map(sv => ({ value: sv, label: sv }))}
          placeholder="Услуга"
        />
        {scoreOptions && onScoreFilterChange && (
          <RadioPicker
            value={scoreFilter ?? ''}
            onChange={onScoreFilterChange}
            options={scoreOptions}
            placeholder="Оценка"
          />
        )}
        {hasFilters && (
          <button className={s.clearBtn} onClick={onClearFilters}>Очистить фильтры</button>
        )}
      </div>
    </Card>
  )
}
