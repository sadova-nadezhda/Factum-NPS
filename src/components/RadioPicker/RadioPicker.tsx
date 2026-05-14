import React, { useState, useRef, useEffect } from 'react'
import s from './RadioPicker.module.scss'

export interface RadioOption {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (v: string) => void
  options: RadioOption[]
  placeholder: string
  align?: 'left' | 'right'
}

export function RadioPicker({ value, onChange, options, placeholder, align = 'left' }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const label = options.find(o => o.value === value)?.label ?? placeholder

  const select = (v: string) => {
    onChange(v === value ? '' : v)
    setOpen(false)
  }

  return (
    <div className={s.wrapper} ref={wrapRef}>
      <button
        className={`${s.trigger} ${value ? s.triggerActive : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        {label}
        <svg className={`${s.chevron} ${open ? s.chevronUp : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className={s.dropdown} style={align === 'right' ? { left: 'auto', right: 0 } : undefined}>
          {options.map(o => (
            <div
              key={o.value}
              className={`${s.option} ${value === o.value ? s.optionActive : ''}`}
              onClick={() => select(o.value)}
            >
              <span className={`${s.radio} ${value === o.value ? s.radioOn : ''}`} />
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
