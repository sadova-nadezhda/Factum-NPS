import type { NpsRecord, BitrixPage, RecordStatus } from '../types'

// TODO: заменить на реальное поле после получения от заказчика
const BITRIX_STATUS_FIELD = 'UF_CRM_NPS_STATUS' as const

const BITRIX_STATUS_MAP: Record<string, RecordStatus> = {
  '1036': 'received',
  '1038': 'waiting',
  '1040': 'not_called',
  '1042': 'unavailable',
}

const STATUS_TO_BITRIX: Record<string, string> = {
  received:    '1036',
  waiting:     '1038',
  not_called:  '1040',
  unavailable: '1042',
}

function mapBitrixStatus(raw: string | null | undefined): RecordStatus {
  if (!raw || raw.trim() === '') return 'not_called'
  return BITRIX_STATUS_MAP[raw.trim()] ?? 'not_called'
}
import { MOCK_RECORDS } from '../data/mock'

const WEBHOOK = (import.meta.env.VITE_BITRIX_WEBHOOK as string | undefined)?.replace(/\/+$/, '')

const PROJECT_CATEGORY_IDS = ['12', '6', '8', '14', '16', '28']

const PROJECT_CATEGORY_SERVICE_MAP: Record<string, string> = {
  '12': 'Web',
  '6': 'ADS',
  '8': 'SEO',
  '14': 'Target',
  '16': 'SMM Астана',
  '28': 'SMM Алматы',
}

interface BitrixContact {
  ID: string
  NAME?: string
  SECOND_NAME?: string
  LAST_NAME?: string
  PHONE?: Array<{ VALUE: string; VALUE_TYPE: string }>
}

interface BitrixDeal {
  ID: string
  TITLE?: string
  CONTACT_ID?: string
  COMPANY_ID?: string
  COMPANY_TITLE?: string
  ASSIGNED_BY_ID?: string
  CATEGORY_ID?: string
  DATE_CREATE?: string
  UF_CRM_1737637647?: string | number | null
  UF_CRM_NPS_COMMENT?: string | null
  [key: string]: unknown
}

// ─── Score list map (list-field ID ↔ score value 1-10) ───────
interface ScoreMaps {
  idToScore: Map<string, number>  // "918" → 7
  scoreToId: Map<number, string>  // 7 → "918"
}

let scoreMapsCache: ScoreMaps | null = null

async function fetchScoreMaps(): Promise<ScoreMaps> {
  if (scoreMapsCache) return scoreMapsCache

  if (!WEBHOOK) {
    scoreMapsCache = { idToScore: new Map(), scoreToId: new Map() }
    return scoreMapsCache
  }

  try {
    const res = await fetch(`${WEBHOOK}/crm.deal.userfield.list.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filter: { FIELD_NAME: 'UF_CRM_1737637647' } }),
    })
    const data = await res.json() as {
      result?: Array<{ LIST?: Array<{ ID: string; VALUE: string }> }>
    }
    const items = data.result?.[0]?.LIST ?? []

    const idToScore = new Map(items.map(i => [i.ID, Number(i.VALUE)]))
    const scoreToId = new Map(items.map(i => [Number(i.VALUE), i.ID]))
    scoreMapsCache = { idToScore, scoreToId }
  } catch {
    scoreMapsCache = { idToScore: new Map(), scoreToId: new Map() }
  }

  return scoreMapsCache
}

async function fetchEntities(
  endpoint: string,
  ids: string[],
  select: string[]
): Promise<Record<string, BitrixContact>> {
  if (!WEBHOOK || ids.length === 0) return {}

  const res = await fetch(`${WEBHOOK}/${endpoint}.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ select, filter: { ID: ids }, order: { ID: 'ASC' }, start: 0 }),
  })

  const data = await res.json() as { result?: BitrixContact[] }

  return Array.isArray(data.result)
    ? data.result.reduce<Record<string, BitrixContact>>((map, item) => {
        map[String(item.ID)] = item
        return map
      }, {})
    : {}
}

function formatContactName(contact: Partial<BitrixContact> = {}): string {
  return [contact.NAME, contact.SECOND_NAME, contact.LAST_NAME]
    .filter(Boolean)
    .join(' ')
    .trim()
}

async function fetchProjectsPageFromBitrix(start: number, scoreMaps: ScoreMaps): Promise<BitrixPage> {
  if (!WEBHOOK) {
    return { records: MOCK_RECORDS, next: null, total: MOCK_RECORDS.length }
  }

  const res = await fetch(`${WEBHOOK}/crm.deal.list.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      select: [
        'ID', 'TITLE', 'CONTACT_ID', 'COMPANY_ID', 'COMPANY_TITLE',
        'ASSIGNED_BY_ID', 'CATEGORY_ID', 'STAGE_ID', 'TYPE_ID', 'DATE_CREATE', 'CLOSED',
        'UF_CRM_1737637647', 'UF_CRM_NPS_COMMENT', BITRIX_STATUS_FIELD,
      ],
      filter: { CATEGORY_ID: PROJECT_CATEGORY_IDS, CLOSED: 'N' },
      order: { DATE_CREATE: 'DESC' },
      start,
    }),
  })

  const data = await res.json() as { result?: BitrixDeal[]; next?: number; total?: number }
  const deals = Array.isArray(data.result) ? data.result : []

  const contactIds = [...new Set(deals.map(d => d.CONTACT_ID).filter(Boolean).map(String))]
  const companyIds = [...new Set(deals.map(d => d.COMPANY_ID).filter(Boolean).map(String))]
  const userIds = [...new Set(deals.map(d => d.ASSIGNED_BY_ID).filter(Boolean).map(String))]

  const [contacts, companies, users] = await Promise.all([
    fetchEntities('crm.contact.list', contactIds, ['ID', 'NAME', 'SECOND_NAME', 'LAST_NAME', 'PHONE']),
    fetchEntities('crm.company.list', companyIds, ['ID', 'TITLE']),
    fetchEntities('user.get', userIds, ['ID', 'NAME', 'SECOND_NAME', 'LAST_NAME']),
  ])

  const records: NpsRecord[] = deals.map((deal) => {
    const categoryId = String(deal.CATEGORY_ID ?? '')
    const contact = contacts[String(deal.CONTACT_ID)] ?? {}
    const company = companies[String(deal.COMPANY_ID)] ?? {}
    const user = users[String(deal.ASSIGNED_BY_ID)] ?? {}

    return {
      id: String(deal.ID),
      bitrixDealId: String(deal.ID),
      project: deal.TITLE ?? '',
      date: deal.DATE_CREATE?.split('T')[0] ?? '',
      service: PROJECT_CATEGORY_SERVICE_MAP[categoryId] ?? 'Неизвестно',
      department: categoryId,
      specialist: formatContactName(user) || String(deal.ASSIGNED_BY_ID ?? ''),
      company: (company as { TITLE?: string }).TITLE ?? deal.COMPANY_TITLE ?? deal.TITLE ?? '',
      client: formatContactName(contact) || String(deal.CONTACT_ID ?? ''),
      contactId: String(deal.CONTACT_ID ?? ''),
      companyId: String(deal.COMPANY_ID ?? ''),
      phone: contact.PHONE?.[0]?.VALUE ?? '',
      score: deal.UF_CRM_1737637647 != null && deal.UF_CRM_1737637647 !== ''
        ? (scoreMaps.idToScore.get(String(deal.UF_CRM_1737637647)) ?? null)
        : null,
      comment: deal.UF_CRM_NPS_COMMENT ?? '',
      status: deal.UF_CRM_1737637647 != null && deal.UF_CRM_1737637647 !== ''
        ? 'received'
        : mapBitrixStatus(deal[BITRIX_STATUS_FIELD] as string | null),
      called: false,
    }
  })

  return {
    records,
    next: typeof data.next === 'number' ? data.next : null,
    total: data.total ?? records.length,
  }
}

export const bitrix24 = {
  async fetchProjectsPage(start = 0): Promise<BitrixPage> {
    try {
      const scoreMaps = await fetchScoreMaps()
      return await fetchProjectsPageFromBitrix(start, scoreMaps)
    } catch (err) {
      console.error('[Bitrix24] Ошибка загрузки карточек проектов:', err)
      return { records: MOCK_RECORDS, next: null, total: MOCK_RECORDS.length }
    }
  },

  async fetchAllPages(): Promise<NpsRecord[]> {
    if (!WEBHOOK) return MOCK_RECORDS

    const scoreMaps = await fetchScoreMaps()
    const all: NpsRecord[] = []
    let start: number | null = 0
    try {
      while (start !== null) {
        const page = await fetchProjectsPageFromBitrix(start, scoreMaps)
        all.push(...page.records)
        start = page.next
      }
    } catch (err) {
      console.error('[Bitrix24] Ошибка загрузки всех страниц:', err)
      return all.length > 0 ? all : MOCK_RECORDS
    }
    return all
  },

  async sendNpsToDeal(
    dealId: string,
    score: number | null,
    comment = '',
    status = 'received'
  ): Promise<{ ok: boolean; error?: unknown }> {
    if (!WEBHOOK) {
      console.info('[Bitrix24] Мок: NPS', score, 'для сделки', dealId)
      return { ok: true }
    }

    const id = String(dealId).replace(/^B24-/i, '')
    const scoreMaps = await fetchScoreMaps()
    const scoreListId = score !== null ? (scoreMaps.scoreToId.get(score) ?? score) : null
    const bitrixStatus = STATUS_TO_BITRIX[status] ?? 'Ожидание'

    try {
      await fetch(`${WEBHOOK}/crm.deal.update.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, fields: { UF_CRM_1737637647: scoreListId, UF_CRM_NPS_SCORE: score, UF_CRM_NPS_COMMENT: comment, [BITRIX_STATUS_FIELD]: bitrixStatus } }),
      })

      await fetch(`${WEBHOOK}/crm.timeline.comment.add.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            ENTITY_ID: id,
            ENTITY_TYPE: 'deal',
            COMMENT: `NPS оценка: ${score}/10\n${comment}`,
          },
        }),
      })

      return { ok: true }
    } catch (err) {
      console.error('[Bitrix24] Ошибка отправки NPS:', err)
      return { ok: false, error: err }
    }
  },

  async sendStatusToDeal(dealId: string, status: string): Promise<{ ok: boolean }> {
    if (!WEBHOOK) return { ok: true }

    const id = String(dealId).replace(/^B24-/i, '')
    const bitrixStatus = STATUS_TO_BITRIX[status] ?? 'Ожидание'

    try {
      await fetch(`${WEBHOOK}/crm.deal.update.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, fields: { [BITRIX_STATUS_FIELD]: bitrixStatus } }),
      })
      return { ok: true }
    } catch (err) {
      console.error('[Bitrix24] Ошибка обновления статуса:', err)
      return { ok: false }
    }
  },
}
