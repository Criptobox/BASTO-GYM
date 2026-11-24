export type PlanId = 'dia' | 'semana' | 'mes' | 'anio'
export type Method = 'efectivo' | 'tarjeta' | 'transferencia'

export interface Client {
  id: string
  name: string
  phone: string
  carnet: string // documento de identidad, normalizado (sin espacios ni guiones, en mayúsculas)
  plan: PlanId
  startDate: string // YYYY-MM-DD
  nextDue: string // YYYY-MM-DD
}

export interface Product {
  id: string
  name: string
  variant: string
  category: 'Proteínas' | 'Bebidas' | 'Ropa' | 'Accesorios'
  price: number
  stock: number
  isNew?: boolean
  photo?: string // URL de la foto WebP (GitHub) o data URL en desarrollo
}

export interface Movement {
  id: string
  shiftId: string
  kind: 'mensualidad' | 'venta'
  label: string
  detail?: string
  amount: number
  method: Method
  at: string // ISO datetime
}

export interface Shift {
  id: string
  worker: string
  openedAt: string
  closedAt?: string
  countedCash?: number
  expectedCash?: number
}

export interface Settings {
  gymName: string
  currency: string // ISO 4217
  locale: string
  countryCode: string // phone prefix, sin "+"
  planPrices: Record<PlanId, number>
  worker: string
}
