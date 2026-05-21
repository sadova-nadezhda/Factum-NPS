export function getScoreHint(score: number): string {
  if (score <= 6) return '⚠️ Критик — требует особого внимания'
  if (score <= 8) return '😐 Пассив — нейтральная оценка'
  return '⭐ Промоутер — вероятно порекомендует'
}

export function npsColor(nps: number | null): string {
  if (nps === null) return '#94A3B8'
  if (nps >= 50) return '#22C55E'
  if (nps >= 0)  return '#F59E0B'
  return '#EF4444'
}

export function scoreRowColors(score: number | null): { bg: string | undefined; text: string } {
  if (score === null) return { bg: undefined, text: 'var(--text-muted)' }
  if (score >= 9) return { bg: '#F0FDF4', text: '#22C55E' }
  if (score >= 7) return { bg: '#FFFBEB', text: '#F59E0B' }
  return { bg: '#FEF2F2', text: '#EF4444' }
}
