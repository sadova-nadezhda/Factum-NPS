import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useState,
  useEffect,
} from 'react'

import type { NpsRecord, ToastState, StoreContextValue, AddRecordInput } from '../types'
import { MOCK_RECORDS } from '../data/mock'
import { bitrix24 } from '../services/bitrix24'
import { callCycle } from '../services/callCycle'

const StoreContext = createContext<StoreContextValue | null>(null)

type State = { records: NpsRecord[] }
type Action =
  | { type: 'SET_RECORDS'; payload: NpsRecord[] }
  | { type: 'ADD_RECORD'; payload: NpsRecord }
  | { type: 'UPDATE_RECORD'; payload: Partial<NpsRecord> & { id: string } }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_RECORDS':
      return { ...state, records: action.payload }
    case 'ADD_RECORD':
      return { ...state, records: [action.payload, ...state.records] }
    case 'UPDATE_RECORD':
      return {
        ...state,
        records: state.records.map(r =>
          r.id === action.payload.id ? { ...r, ...action.payload } : r
        ),
      }
    default:
      return state
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { records: MOCK_RECORDS })
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '' })
  const [loading, setLoading] = useState(false)

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message })
    setTimeout(() => setToast({ visible: false, message: '' }), 2500)
  }, [])

  const addRecord = useCallback((input: AddRecordInput): NpsRecord => {
    const newRecord: NpsRecord = {
      ...input,
      id: String(Date.now()),
      bitrixDealId: input.bitrixDealId ?? null,
      date: new Date().toISOString().split('T')[0],
      score: input.score ?? null,
      status: input.status ?? 'waiting',
      called: input.called ?? false,
      comment: input.comment ?? '',
    }
    dispatch({ type: 'ADD_RECORD', payload: newRecord })
    showToast('Запись добавлена')
    return newRecord
  }, [showToast])

  const updateRecord = useCallback(async (id: string, updates: Partial<NpsRecord>) => {
    const record = state.records.find(r => r.id === id)
    if (updates.called) callCycle.markCalled(id)
    if (updates.status === 'unavailable') callCycle.markUnavailable(id)
    dispatch({ type: 'UPDATE_RECORD', payload: { id, ...updates } })

    if (updates.score !== undefined && record?.bitrixDealId) {
      const result = await bitrix24.sendNpsToDeal(
        record.bitrixDealId,
        updates.score,
        updates.comment ?? record.comment ?? '',
        updates.status ?? record.status ?? 'received'
      )
      showToast(result.ok
        ? 'Оценка сохранена и отправлена в Битрикс24'
        : 'Оценка сохранена, но Битрикс24 недоступен'
      )
      return
    }

    if (updates.status && record?.bitrixDealId) {
      await bitrix24.sendStatusToDeal(record.bitrixDealId, updates.status)
    }

    showToast('Сохранено')
  }, [state.records, showToast])

  const loadFromBitrix = useCallback(async () => {
    setLoading(true)
    showToast('Загрузка всех проектов из Битрикс24...')
    try {
      const records = await bitrix24.fetchAllPages()
      const calledIds = callCycle.getCalledIds()
      const unavailableIds = callCycle.getUnavailableIds()
      const withCycle = records.map(r => ({
        ...r,
        called: calledIds.has(r.id),
        status: unavailableIds.has(r.id) ? 'unavailable' : r.status,
      }))
      dispatch({ type: 'SET_RECORDS', payload: withCycle })
      showToast(`Загружено ${records.length} проектов`)
    } catch (err) {
      console.error('[Store] Ошибка загрузки из Битрикс24:', err)
      showToast('Не удалось загрузить данные из Битрикс24')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    loadFromBitrix()
  }, [loadFromBitrix])

  return (
    <StoreContext.Provider value={{ records: state.records, loading, addRecord, updateRecord, loadFromBitrix, toast, showToast }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore(): StoreContextValue {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore must be used inside StoreProvider')
  return context
}

export function useStats(records: NpsRecord[] = []) {
  const withScore = records.filter(r => r.score !== null && r.score !== undefined)
  const responded = withScore.length
  const total = records.length
  const responseRate = total ? Math.round((responded / total) * 100) : 0
  const avg = withScore.length
    ? (withScore.reduce((sum, r) => sum + Number(r.score ?? 0), 0) / withScore.length).toFixed(1)
    : 0

  const promoters  = withScore.filter(r => (r.score ?? 0) >= 9).length
  const passives   = withScore.filter(r => (r.score ?? 0) >= 7 && (r.score ?? 0) <= 8).length
  const detractors = withScore.filter(r => (r.score ?? 0) <= 6).length
  // NPS = %Promoters(9-10) − %Detractors(1-6), range −100…+100
  const nps = responded ? Math.round((promoters - detractors) / responded * 100) : 0
  const qualitative = records.filter(r => r.comment && r.comment.trim().length > 0).length

  return {
    responseRate,
    responded,
    total,
    avg,
    nps,
    promoters,
    passives,
    detractors,
    qualitative,
    low: detractors,
    mid: passives,
    high: promoters,
    waiting: records.filter(r => r.status === 'waiting').length,
    unavailable: records.filter(r => r.status === 'unavailable').length,
    callQueue: records.filter(r => !r.called),
  }
}
