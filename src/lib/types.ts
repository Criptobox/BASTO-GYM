export type PlanId = 'dia' | 'semana' | 'mes' | 'anio'
/** usd = efectivo en dólares · mn = efectivo en moneda nacional · tarjeta = se cobra en MN. */
export type Method = 'usd' | 'tarjeta' | 'mn'

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
  /** Valor en USD (los precios están fijados en USD). */
  amount: number
  method: Method
  /** Lo que se cobró en la moneda del método: USD si method='usd'; MN si 'mn' o 'tarjeta'. */
  paid: number
  /** Tasa MN por 1 USD usada al cobrar (no aplica si method='usd'). */
  rate?: number
  at: string // ISO datetime
}

export interface Shift {
  id: string
  worker: string
  openedAt: string
  closedAt?: string
  countedMN?: number
  countedUSD?: number
  expectedMN?: number
  expectedUSD?: number
}

export interface Settings {
  gymName: string
  locale: string
  countryCode: string // phone prefix, sin "+"
  /** Precio de cada plan, en USD. */
  planPrices: Record<PlanId, number>
  /** MN por 1 USD, y el día (YYYY-MM-DD) para el que se fijó. Debe actualizarse cada día. */
  usdRate: number
  usdRateDate: string
  worker: string
}
