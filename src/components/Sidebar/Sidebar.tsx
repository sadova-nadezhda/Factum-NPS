import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { useStore } from '../../hooks/store'
import styles from './Sidebar.module.scss'

const IconDashboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
)
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const IconFolder = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
)
const IconPhone = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.72 12 19.79 19.79 0 0 1 1.63 3.4 2 2 0 0 1 3.6 1.24h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.84a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
)
const IconSync = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6M1 20v-6h6"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
)

const NAV = [
  { path: '/',         label: 'Дашборд', Icon: IconDashboard },
  { path: '/clients',  label: 'Клиенты', Icon: IconUsers     },
  { path: '/projects', label: 'Проекты', Icon: IconFolder    },
  { path: '/calls',    label: 'Обзвон',  Icon: IconPhone     },
] as const

// ─── Mobile Bottom Nav ───────────────────────────────────────
export function MobileNav({ onAddClick }: { onAddClick: () => void }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { records } = useStore()
  const callQueue = records.filter(r => !r.called).length

  return (
    <nav className={styles.mobileNav}>
      {NAV.map(({ path, label, Icon }) => {
        const active = location.pathname === path
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={clsx(styles.mobileNavItem, active && styles.mobileNavItemActive)}
          >
            <span className={styles.mobileNavIcon}>
              <Icon />
              {path === '/calls' && callQueue > 0 && (
                <span className={styles.mobileBadge}>{callQueue > 99 ? '99+' : callQueue}</span>
              )}
            </span>
            <span className={styles.mobileNavLabel}>{label}</span>
          </button>
        )
      })}
      <button className={styles.mobileNavItem} onClick={onAddClick}>
        <span className={styles.mobileNavIcon}><IconPlus /></span>
        <span className={styles.mobileNavLabel}>Добавить</span>
      </button>
    </nav>
  )
}

interface SidebarProps {
  onAddClick: () => void
}

export default function Sidebar({ onAddClick }: SidebarProps) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { loadFromBitrix, records } = useStore()
  const callQueue = records.filter(r => !r.called).length

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <img src="/img/logo.svg" alt="Factum NPS" />
      </div>

      <nav className={styles.nav}>
        {NAV.map(({ path, label, Icon }) => {
          const active = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={clsx(styles.item, active && styles.itemActive)}
            >
              <span className={styles.icon}><Icon /></span>
              <span className={styles.label}>{label}</span>
              {path === '/calls' && callQueue > 0 && (
                <span className={styles.badge}>{callQueue > 99 ? '99+' : callQueue}</span>
              )}
            </button>
          )
        })}
      </nav>

      <div className={styles.footer}>
        <button className={styles.syncBtn} onClick={loadFromBitrix} title="Синхронизировать с Битрикс24">
          <IconSync />
          <span>Битрикс24</span>
        </button>
        <button className={styles.addBtn} onClick={onAddClick}>
          <IconPlus />
          <span>Добавить</span>
        </button>
      </div>
    </aside>
  )
}
