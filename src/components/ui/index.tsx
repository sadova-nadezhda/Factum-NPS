import React from 'react'
import { clsx } from 'clsx'
import type { RecordStatus } from '../../types'
import styles from './ui.module.scss'

// ─── Score Circle ────────────────────────────────────────────
export function ScoreCircle({ score }: { score: number | null }) {
  let bg = 'var(--surface-2)', color = 'var(--text-muted)', border = 'var(--border-md)'
  if (score !== null) {
    if (score <= 6)               { bg = 'var(--red-bg)';   color = 'var(--red)';   border = '#F5B8B8' }
    if (score >= 7 && score <= 8) { bg = 'var(--amber-bg)'; color = 'var(--amber)'; border = '#F5CA8A' }
    if (score >= 9)               { bg = 'var(--green-bg)'; color = 'var(--green)'; border = '#A8D9A0' }
  }

  return (
    <div
      className={styles.scoreCircle}
      style={{ background: bg, color, border: `1.5px solid ${border}` }}
    >
      {score ?? '—'}
    </div>
  )
}

// ─── Status Badge ────────────────────────────────────────────
const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  received:    { label: 'Получено',   bg: 'var(--green-bg)',  color: 'var(--green)' },
  waiting:     { label: 'Ожидание',   bg: 'var(--amber-bg)', color: 'var(--amber)' },
  unavailable: { label: 'Недоступен', bg: 'var(--red-bg)',   color: 'var(--red)' },
  not_called:  { label: 'Ожидание',   bg: 'var(--amber-bg)', color: 'var(--amber)' },
}

export function StatusBadge({ status }: { status: RecordStatus | string }) {
  const s = STATUS_MAP[status] ?? { label: status, bg: 'var(--surface-2)', color: 'var(--text-secondary)' }
  return (
    <span className={styles.statusBadge} style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

// ─── Service Tag ─────────────────────────────────────────────
export function ServiceTag({ service }: { service: string }) {
  return <span className={styles.serviceTag}>{service}</span>
}

// ─── Score Selector ──────────────────────────────────────────
interface ScoreSelectorProps {
  value: number | null
  onChange: (score: number | null) => void
}

export function ScoreSelector({ value, onChange }: ScoreSelectorProps) {
  const getStyle = (n: number): React.CSSProperties => {
    if (n !== value) return {}
    if (n <= 6) return { background: 'var(--red-bg)',   borderColor: '#E24B4A', color: 'var(--red)' }
    if (n <= 8) return { background: 'var(--amber-bg)', borderColor: '#EF9F27', color: 'var(--amber)' }
    return              { background: 'var(--green-bg)', borderColor: '#639922', color: 'var(--green)' }
  }

  return (
    <div className={styles.scoreSelector}>
      {([1,2,3,4,5,6,7,8,9,10] as const).map(n => (
        <button
          key={n}
          onClick={() => onChange(n === value ? null : n)}
          className={clsx(styles.scoreButton, n === value && styles.scoreButtonActive)}
          style={getStyle(n)}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

// ─── Input ───────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, ...props }: InputProps) {
  return (
    <div className={styles.inputGroup}>
      {label && <label className={styles.label}>{label}</label>}
      <input className={styles.input} {...props} />
    </div>
  )
}

// ─── Select ──────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  children: React.ReactNode
}

export function Select({ label, children, ...props }: SelectProps) {
  return (
    <div className={styles.selectGroup}>
      {label && <label className={styles.label}>{label}</label>}
      <select className={styles.select} {...props}>
        {children}
      </select>
    </div>
  )
}

// ─── Button ──────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  children: React.ReactNode
}

export function Button({ variant = 'primary', children, ...props }: ButtonProps) {
  return (
    <button className={clsx(styles.button, styles[variant])} {...props}>
      {children}
    </button>
  )
}

// ─── Section Label ───────────────────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className={styles.sectionLabel}>{children}</div>
}

// ─── Card ────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

export function Card({ children, style, className }: CardProps) {
  return <div className={clsx(styles.card, className)} style={style}>{children}</div>
}

// ─── Toast ───────────────────────────────────────────────────
export function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className={clsx(styles.toast, visible ? styles.toastVisible : styles.toastHidden)}>
      ✓ {message}
    </div>
  )
}
