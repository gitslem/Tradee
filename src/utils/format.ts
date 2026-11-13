/**
 * Price formatting that stays readable for both BTC (60000) and DOGE (0.1234)
 */
export const formatPrice = (value: number): string => {
  if (!Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  if (abs >= 1000) return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (abs >= 1) return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  if (abs === 0) return '0'
  return value.toPrecision(4).replace(/0+$/, '').replace(/\.$/, '')
}
