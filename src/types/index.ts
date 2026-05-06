export type RecordStatus = 'received' | 'waiting' | 'unavailable' | 'not_called'

export interface NpsRecord {
  id: string
  bitrixDealId: string | null
  date: string
  project?: string
  service: string
  department?: string
  specialist: string
  company: string
  client: string
  contactId?: string
  companyId?: string
  phone: string
  score: number | null
  status: RecordStatus
  called: boolean
  comment: string
}

export interface BitrixPage {
  records: NpsRecord[]
  next: number | null
  total: number
}

export interface ToastState {
  visible: boolean
  message: string
}

export type AddRecordInput = Pick<
  NpsRecord,
  'service' | 'specialist' | 'company' | 'client' | 'phone' | 'score'
> & Partial<Pick<NpsRecord, 'status' | 'called' | 'comment' | 'bitrixDealId' | 'contactId' | 'companyId' | 'project'>>

export interface StoreContextValue {
  records: NpsRecord[]
  loading: boolean
  toast: ToastState
  addRecord: (input: AddRecordInput) => NpsRecord
  updateRecord: (id: string, updates: Partial<NpsRecord>) => Promise<void>
  loadFromBitrix: () => Promise<void>
  showToast: (message: string) => void
}
