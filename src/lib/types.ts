export type PlanId = 'dia' | 'semana' | 'mes' | 'anio'
export type Method = 'efectivo' | 'tarjeta' | 'transferencia'

export interface Client {
  id: string
  name: string
  phone: string
  email: string
  plan: PlanId
  startDate: string // YYYY-MM-DD
  nextDue: string // YYYY-MM-DD
  photo?: string // data URL
}

export interface Product {
  id: string
  name: string
  variant: string
  category: 'Proteínas' | 'Bebidas' | 'Ropa' | 'Accesorios'
  price: number
  stock: number
  isNew?: boolean
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
