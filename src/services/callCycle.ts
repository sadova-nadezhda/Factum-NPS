const STORAGE_KEY = 'nps_call_cycle'

interface CycleData {
  cycle: string        // "YYYY-MM"
  calledIds: string[]
  unavailableIds: string[]
}

function computeCycleKey(): string {
  const now = new Date()
  if (now.getDate() >= 10) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }
  const prev = new Date(now.getFullYear(), now.getMonth() - 1)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
}

function loadStored(): CycleData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { unavailableIds: [], ...JSON.parse(raw) } as CycleData
  } catch {}
  return { cycle: '', calledIds: [], unavailableIds: [] }
}

function persist(data: CycleData): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
}

function currentData(): { key: string; data: CycleData } {
  const stored = loadStored()
  const key = computeCycleKey()
  if (stored.cycle !== key) {
    const fresh: CycleData = { cycle: key, calledIds: [], unavailableIds: [] }
    persist(fresh)
    return { key, data: fresh }
  }
  return { key, data: stored }
}

export const callCycle = {
  getCalledIds(): Set<string> {
    return new Set(currentData().data.calledIds)
  },

  getUnavailableIds(): Set<string> {
    return new Set(currentData().data.unavailableIds)
  },

  markCalled(id: string): void {
    const { key, data } = currentData()
    if (!data.calledIds.includes(id)) data.calledIds.push(id)
    // если был помечен как недоступный — снимаем
    data.unavailableIds = data.unavailableIds.filter(x => x !== id)
    persist({ ...data, cycle: key })
  },

  markUnavailable(id: string): void {
    const { key, data } = currentData()
    if (!data.unavailableIds.includes(id)) data.unavailableIds.push(id)
    persist({ ...data, cycle: key })
  },

  getCurrentCycleKey: computeCycleKey,
}
