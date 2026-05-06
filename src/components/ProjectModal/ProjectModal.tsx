import React, { useState, useEffect } from 'react'
import { ScoreSelector, StatusBadge, ServiceTag, Button } from '../ui'
import { useStore } from '../../hooks/store'
import type { NpsRecord } from '../../types'
import styles from './ProjectModal.module.scss'

interface ProjectModalProps {
  record: NpsRecord | null
  onClose: () => void
}

const FIELD_ROWS: { label: string; key: keyof NpsRecord }[] = [
  { label: 'Компания',      key: 'company' },
  { label: 'Клиент',        key: 'client' },
  { label: 'Телефон',       key: 'phone' },
  { label: 'Услуга',        key: 'service' },
  { label: 'Специалист',    key: 'specialist' },
  { label: 'Дата',          key: 'date' },
]

function formatDate(d: string) {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ProjectModal({ record, onClose }: ProjectModalProps) {
  const { updateRecord } = useStore()
  const [score, setScore]     = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (record) {
      setScore(record.score)
      setComment(record.comment ?? '')
    }
  }, [record])

  if (!record) return null

  const handleSave = async () => {
    setSaving(true)
    await updateRecord(record.id, {
      score,
      comment,
      status: score !== null ? 'received' : 'waiting',
      called: score !== null,
    })
    setSaving(false)
    onClose()
  }

  const handleNoDial = async () => {
    await updateRecord(record.id, { status: 'unavailable', called: true })
    onClose()
  }

  const getValue = (key: keyof NpsRecord): string => {
    const val = record[key]
    if (key === 'date') return formatDate(String(val ?? ''))
    return String(val ?? '') || '—'
  }

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.title}>{record.project || record.company || 'Проект'}</h2>
          </div>
          <div className={styles.headerRight}>
            <StatusBadge status={record.status} />
            <button className={styles.closeBtn} onClick={onClose}>×</button>
          </div>
        </div>

        <div className={styles.body}>
          <div className={styles.info}>
            {FIELD_ROWS.map(({ label, key }) => {
              const val = getValue(key)
              if (!val || val === '—') return null
              return (
                <div key={key} className={styles.fieldRow}>
                  <span className={styles.fieldLabel}>{label}</span>
                  <span className={styles.fieldValue}>
                    {key === 'phone'
                      ? <a href={`tel:${val}`} className={styles.phoneLink}>{val}</a>
                      : val}
                  </span>
                </div>
              )
            })}
          </div>

          <div className={styles.divider} />

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Оценка NPS</div>
            <ScoreSelector value={score} onChange={setScore} />
            {score !== null && (
              <div className={styles.scoreHint}>
                {score <= 6 && '⚠️ Критик — требует особого внимания'}
                {score >= 7 && score <= 8 && '😐 Пассив — нейтральная оценка'}
                {score >= 9 && '⭐ Промоутер — вероятно порекомендует'}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Комментарий</div>
            <textarea
              className={styles.textarea}
              placeholder="Комментарий клиента..."
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={handleNoDial}>
            Не дозвонились
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </>
  )
}
