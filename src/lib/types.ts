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
  /** Día desde el que la membresía está congelada (YYYY-MM-DD). Congelada: no se cobra ni se avisa. */
  frozenAt?: string
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

/** Una parte de un cobro: lo entregado en un método, en la moneda de ese método. */
export interface PaymentPart {
  method: Method
  /** USD si method='usd'; MN si 'mn' o 'tarjeta'. */
  paid: number
  /** Tasa MN por 1 USD usada (no aplica a USD). */
  rate?: number
  /** Valor de esta parte en USD. */
  usd: number
}

export interface Movement {
  id: string
  shiftId: string
  kind: 'mensualidad' | 'venta'
  label: string
  detail?: string
  /** Precio total en USD (los precios están fijados en USD). */
  amount: number
  /** Cómo se pagó: una o varias partes (USD, tarjeta y/o MN). Lo que se recibió, antes del vuelto. */
  parts: PaymentPart[]
  /** Vuelto entregado en efectivo (USD o MN), si se recibió de más. */
  change?: PaymentPart
  /** Cliente al que se cobró (mensualidades e inscripciones). */
  clientId?: string
  at: string // ISO datetime
  /** Quién registró el cobro. */
  workerId?: string
  worker?: string
}

export interface Worker {
  id: string
  name: string
  role: 'admin' | 'worker'
  active: boolean
  salt: string
  /** null = todavía sin clave: no puede entrar hasta que el administrador la asigne. */
  pinHash: string | null
}

export interface Shift {
  id: string
  worker: string // nombre, para el historial
  workerId?: string
  openedAt: string
  /** Efectivo con el que empezó el turno (fondo inicial). */
  openingMN?: number
  openingUSD?: number
  closedAt?: string
  closedBy?: string // quién cerró el turno (el dueño, o el administrador)
  countedMN?: number
  countedUSD?: number
  expectedMN?: number
  expectedUSD?: number
}

/** Salida de efectivo de la caja durante un turno: un gasto del local o un retiro. */
export interface CashOut {
  id: string
  shiftId: string
  kind: 'gasto' | 'retiro'
  concept: string
  /** Efectivo que salió, en cada moneda. */
  mn: number
  usd: number
  at: string
  workerId?: string
  worker?: string
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
}
