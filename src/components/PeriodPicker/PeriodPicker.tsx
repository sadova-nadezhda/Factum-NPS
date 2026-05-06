import React, { useState, useRef, useEffect } from 'react'
import s from './PeriodPicker.module.scss'

export interface PeriodFilter {
  type: '' | 'week' | 'this_month' | 'last_month' | 'quarter' | 'custom'
  from?: string
  to?: string
}

const PRESETS: { value: PeriodFilter['type']; label: string }[] = [
  { value: 'week',       label: 'Неделя' },
  { value: 'this_month', label: 'Этот месяц' },
  { value: 'last_month', label: 'Прошлый месяц' },
  { value: 'quarter',    label: 'Квартал' },
  { value: 'custom',     label: 'Свой период' },
]

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const DAYS_RU   = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function todayISO() {
  const d = new Date()
  return toISO(d.getFullYear(), d.getMonth(), d.getDate())
}

function fmtShort(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function getLabel(v: PeriodFilter): string {
  if (!v.type) return 'Период'
  if (v.type === 'custom') {
    if (v.from && v.to) return `${fmtShort(v.from)} – ${fmtShort(v.to)}`
    return 'Свой период'
  }
  return PRESETS.find(p => p.value === v.type)?.label ?? 'Период'
}

interface Props {
  value: PeriodFilter
  onChange: (v: PeriodFilter) => void
}

export function PeriodPicker({ value, onChange }: Props) {
  const [open, setOpen]         = useState(false)
  const [calYear, setCalYear]   = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth())
  const [pickFrom, setPickFrom] = useState<string | null>(value.from ?? null)
  const [pickTo, setPickTo]     = useState<string | null>(value.to ?? null)
  const [hover, setHover]       = useState<string | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const selectPreset = (type: PeriodFilter['type']) => {
    if (type === 'custom') {
      onChange({ type: 'custom', from: pickFrom ?? undefined, to: pickTo ?? undefined })
    } else {
      onChange({ type })
      setOpen(false)
    }
  }

  const daysInMonth     = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
  const firstDayOffset  = (y: number, m: number) => { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1 }

  const effectiveTo = pickTo ?? (pickFrom && hover && hover >= pickFrom ? hover : null)
  const isStart  = (iso: string) => iso === pickFrom
  const isEnd    = (iso: string) => !!effectiveTo && iso === effectiveTo
  const isSingle = (iso: string) => isStart(iso) && isEnd(iso)
  const inRange  = (iso: string) => !!pickFrom && !!effectiveTo && iso > pickFrom && iso < effectiveTo

  const handleDay = (iso: string) => {
    if (!pickFrom || pickTo) {
      setPickFrom(iso)
      setPickTo(null)
    } else if (iso >= pickFrom) {
      setPickTo(iso)
      onChange({ type: 'custom', from: pickFrom, to: iso })
      setOpen(false)
    } else {
      setPickFrom(iso)
      setPickTo(null)
    }
  }

  const prevMonth = () => calMonth === 0 ? (setCalYear(y => y - 1), setCalMonth(11)) : setCalMonth(m => m - 1)
  const nextMonth = () => calMonth === 11 ? (setCalYear(y => y + 1), setCalMonth(0)) : setCalMonth(m => m + 1)

  const dim    = daysInMonth(calYear, calMonth)
  const offset = firstDayOffset(calYear, calMonth)
  const cells  = Math.ceil((dim + offset) / 7) * 7
  const today  = todayISO()

  return (
    <div className={s.wrapper} ref={wrapRef}>
      <button
        className={`${s.trigger} ${value.type ? s.triggerActive : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        {getLabel(value)}
        <svg className={`${s.chevron} ${open ? s.chevronUp : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className={s.dropdown}>
          <div className={s.options}>
            {PRESETS.map(p => (
              <div
                key={p.value}
                className={`${s.option} ${value.type === p.value ? s.optionActive : ''}`}
                onClick={() => selectPreset(p.value)}
              >
                <span className={`${s.radio} ${value.type === p.value ? s.radioOn : ''}`} />
                {p.label}
              </div>
            ))}
          </div>

          {value.type === 'custom' && (
            <div className={s.calendar}>
              <div className={s.calHeader}>
                <button className={s.calNav} onClick={prevMonth}>‹</button>
                <span className={s.calTitle}>{MONTHS_RU[calMonth]} {calYear}</span>
                <button className={s.calNav} onClick={nextMonth}>›</button>
              </div>

              <div className={s.calGrid}>
                {DAYS_RU.map(d => <div key={d} className={s.dayName}>{d}</div>)}

                {Array.from({ length: cells }, (_, i) => {
                  const num = i - offset + 1
                  if (num < 1 || num > dim) return <div key={i} />

                  const iso = toISO(calYear, calMonth, num)
                  const start  = isStart(iso)
                  const end    = isEnd(iso)
                  const single = isSingle(iso)
                  const range  = inRange(iso)
                  const isT    = iso === today && !start && !end

                  return (
                    <div
                      key={iso}
                      className={[
                        s.dayCell,
                        range  && s.cellRange,
                        start  && !single && s.cellStart,
                        end    && !single && s.cellEnd,
                      ].filter(Boolean).join(' ')}
                    >
                      <button
                        className={[
                          s.day,
                          (start || end) && s.daySelected,
                          isT && s.dayToday,
                        ].filter(Boolean).join(' ')}
                        onClick={() => handleDay(iso)}
                        onMouseEnter={() => setHover(iso)}
                        onMouseLeave={() => setHover(null)}
                      >
                        {num}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
