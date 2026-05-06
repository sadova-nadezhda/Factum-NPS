import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { useStore } from '../../hooks/store'
import styles from './Topbar.module.scss'

const TABS = [
  { path: '/',      label: 'Дашборд' },
  { path: '/calls', label: 'Обзвон' },
] as const

interface TopbarProps {
  onAddClick: () => void
}

export default function Topbar({ onAddClick }: TopbarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { loadFromBitrix, records } = useStore()

  const callQueue = records.filter(r => !r.called).length

  return (
    <header className={styles.header}>
      <div className="container">
        <div className={styles.container}>
          <div className={styles.left}>
            <div className={styles.brand}>
              <img src='/img/logo.svg' alt='factum.nps' />
            </div>

            <nav className={styles.nav}>
              {TABS.map(tab => {
                const active = location.pathname === tab.path
                return (
                  <button
                    key={tab.path}
                    onClick={() => navigate(tab.path)}
                    className={clsx(styles.tabButton, active && styles.tabButtonActive)}
                  >
                    {tab.label}
                    {tab.path === '/calls' && callQueue > 0 && (
                      <span className={styles.counterBadge}>{callQueue}</span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className={styles.actions}>
            <button className={styles.syncButton} onClick={loadFromBitrix} title="Синхронизировать с Битрикс24">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
              <span className={styles.btnText}>Битрикс24</span>
            </button>

            <button className={styles.addButton} onClick={onAddClick}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              <span className={styles.btnText}>Добавить запись</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
