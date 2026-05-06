import React, { useState, useEffect, useRef } from 'react'
import { Input, Select, ScoreSelector, Button, SectionLabel } from '../ui'
import { useStore } from '../../hooks/store'
import { SERVICES, SPECIALISTS } from '../../data/constants'
import type { AddRecordInput, NpsRecord } from '../../types'
import styles from './AddModal.module.scss'

type FormState = {
  service: string
  specialist: string
  company: string
  client: string
  phone: string
  score: number | null
  comment: string
}

const EMPTY: FormState = {
  service: '',
  specialist: '',
  company: '',
  client: '',
  phone: '',
  score: null,
  comment: '',
}

interface AddModalProps {
  open: boolean
  onClose: () => void
}

export default function AddModal({ open, onClose }: AddModalProps) {
  const { addRecord, records } = useStore()
  const [form, setForm] = useState<FormState>(EMPTY)
  const [companySuggestions, setCompanySuggestions] = useState<NpsRecord[]>([])
  const [selectedDeal, setSelectedDeal] = useState<NpsRecord | null>(null)
  const companyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setForm(EMPTY)
      setCompanySuggestions([])
      setSelectedDeal(null)
    }
  }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setCompanySuggestions([])
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const b24Records = records.filter(r => r.bitrixDealId)

  const availableServices = [...new Set(b24Records.map(r => r.service).filter(Boolean))]
  const services = availableServices.length > 0 ? availableServices : [...SERVICES]

  const availableSpecialists = [...new Set(b24Records.map(r => r.specialist).filter(Boolean))]
  const specialists = availableSpecialists.length > 0 ? availableSpecialists : [...SPECIALISTS]

  const handleCompanyChange = (value: string) => {
    setForm(f => ({ ...f, company: value }))
    setSelectedDeal(null)
    if (value.trim().length >= 2) {
      const q = value.toLowerCase()
      const matches = b24Records.filter(r =>
        r.company.toLowerCase().includes(q) ||
        (r.project ?? '').toLowerCase().includes(q)
      ).slice(0, 8)
      setCompanySuggestions(matches)
    } else {
      setCompanySuggestions([])
    }
  }

  const selectSuggestion = (deal: NpsRecord) => {
    setSelectedDeal(deal)
    setCompanySuggestions([])
    setForm(f => ({
      ...f,
      company: deal.company,
      service: deal.service,
      specialist: deal.specialist,
      client: deal.client,
      phone: deal.phone,
    }))
  }

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm(f => ({ ...f, [key]: val }))

  const handleSave = (noAnswer = false) => {
    const input: AddRecordInput = {
      ...form,
      bitrixDealId: selectedDeal?.bitrixDealId ?? undefined,
      contactId: selectedDeal?.contactId,
      companyId: selectedDeal?.companyId,
      project: selectedDeal?.project,
      status: noAnswer ? 'unavailable' : form.score !== null ? 'received' : 'waiting',
      called: noAnswer || form.score !== null,
    }
    addRecord(input)
    onClose()
  }

  if (!open) return null

  return (
    <>
      <div onClick={onClose} className={styles.backdrop} />

      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Добавить запись</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>

        <SectionLabel>Информация о проекте</SectionLabel>
        <div className={styles.sectionBlock}>
          <Select value={form.service} onChange={e => set('service', e.target.value)}>
            <option value="">Услуга</option>
            {services.map(s => <option key={s}>{s}</option>)}
          </Select>
          <Select value={form.specialist} onChange={e => set('specialist', e.target.value)}>
            <option value="">Специалист</option>
            {specialists.map(s => <option key={s}>{s}</option>)}
          </Select>
          <div className={styles.dealSearchWrapper} ref={companyRef}>
            <Input
              placeholder="Компания"
              value={form.company}
              onChange={e => handleCompanyChange(e.target.value)}
            />
            {companySuggestions.length > 0 && (
              <div className={styles.dealDropdown}>
                {companySuggestions.map(deal => (
                  <button
                    key={deal.id}
                    className={styles.dealOption}
                    onMouseDown={() => selectSuggestion(deal)}
                  >
                    <span className={styles.dealOptionTitle}>{deal.company}</span>
                    <span className={styles.dealOptionMeta}>
                      {deal.service} · {deal.specialist}{deal.client ? ` · ${deal.client}` : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <SectionLabel>Информация о клиенте</SectionLabel>
        <div className={styles.sectionBlock}>
          <Input
            placeholder="Имя клиента"
            value={form.client}
            onChange={e => set('client', e.target.value)}
          />
          <Input
            placeholder="Номер телефона"
            type="tel"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
          />
        </div>

        <SectionLabel>Оценка NPS</SectionLabel>
        <div style={{ marginBottom: 20 }}>
          <ScoreSelector value={form.score} onChange={v => set('score', v)} />
          {form.score !== null && (
            <div className={styles.scoreInfo}>
              {form.score <= 6 && '⚠️ Критик — требует особого внимания'}
              {form.score >= 7 && form.score <= 8 && '😐 Пассив — нейтральная оценка'}
              {form.score >= 9 && '⭐ Промоутер — вероятно порекомендует'}
            </div>
          )}
        </div>

        <SectionLabel>Комментарий</SectionLabel>
        <textarea
          placeholder="Комментарий, который оставил клиент..."
          value={form.comment}
          onChange={e => set('comment', e.target.value)}
          className={styles.textarea}
        />

        <div className={styles.footer}>
          <Button variant="secondary" onClick={() => handleSave(true)}>
            Не дозвонились
          </Button>
          <Button variant="primary" onClick={() => handleSave(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Сохранить
          </Button>
        </div>
      </div>
    </>
  )
}
