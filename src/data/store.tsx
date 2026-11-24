import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import { dueInfo, isFrozen, normalizeCarnet, rateIsFresh, renewalDate, settle, summarize, unfreezeDue, type ChangeInput, type PartInput, type ShiftSummary } from '../lib/domain'
import { attemptsLeft, failLock, hashPin, randomSalt, secondsLeft, verifyPin, type LockState } from '../lib/pin'
import type { AlertLog, CashOut, Client, Movement, PlanId, Product, Settings, Shift, Worker } from '../lib/types'
import { defaultSettings, newShift, seedAlerts, seedClients, seedHistory, seedProducts, seedWorkers, today } from './seed'
import { DEMO } from './demo'

/**
 * Estado local persistido en localStorage. Todas las escrituras pasan por las
 * acciones de `useGym()`, así que migrar a Supabase solo exige reemplazar
 * este archivo manteniendo la misma API.
 *
 * OJO: las claves locales sirven para saber QUIÉN registró cada cosa (responsabilidad),
 * no son seguridad real: cualquiera con acceso al navegador puede leer localStorage.
 * La seguridad real llega con Supabase Auth y reglas por rol.
 */
interface State {
  settings: Settings
  clients: Client[]
  products: Product[]
  movements: Movement[]
  shifts: Shift[]
  workers: Worker[]
  cashOuts: CashOut[]
  alerts: AlertLog[]
}

type Action =
  | { type: 'enroll'; client: Client; movement?: Movement }
  | { type: 'pay'; clientId: string; movement: Movement; nextDue: string }
  | { type: 'sell'; movement: Movement; items: { id: string; qty: number }[] }
  | { type: 'closeShift'; shiftId: string; by: string; countedMN: number; countedUSD: number; expectedMN: number; expectedUSD: number }
  | { type: 'openShift'; shift: Shift }
  | { type: 'addCashOut'; out: CashOut }
  | { type: 'updateClient'; id: string; patch: Partial<Client> }
  | { type: 'logAlert'; alert: AlertLog }
  | { type: 'addProduct'; product: Product }
  | { type: 'updateProduct'; id: string; patch: Partial<Product> }
  | { type: 'setSettings'; patch: Partial<Settings> }
  | { type: 'addWorker'; worker: Worker }
  | { type: 'updateWorker'; id: string; patch: Partial<Worker> }

// La demo guarda aparte (y desde cero) para no mezclarse con datos reales.
const KEY = DEMO ? 'basto-gym:demo-v1' : 'basto-gym:v8'
const SESSION_KEY = 'basto-gym:session'
const LOCK_KEY = 'basto-gym:locks'

function initial(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as State
  } catch { /* almacenamiento no disponible */ }
  return {
    settings: defaultSettings,
    clients: seedClients(),
    products: seedProducts,
    movements: seedHistory().movements,
    shifts: seedHistory().shifts,
    workers: seedWorkers(),
    cashOuts: seedHistory().cashOuts,
    alerts: seedAlerts(),
  }
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'enroll':
      return { ...s, clients: [a.client, ...s.clients], movements: a.movement ? [a.movement, ...s.movements] : s.movements }
    case 'pay':
      return {
        ...s,
        clients: s.clients.map((c) => (c.id === a.clientId ? { ...c, nextDue: a.nextDue } : c)),
        movements: [a.movement, ...s.movements],
      }
    case 'sell':
      return {
        ...s,
        products: s.products.map((p) => {
          const it = a.items.find((i) => i.id === p.id)
          return it ? { ...p, stock: Math.max(0, p.stock - it.qty) } : p
        }),
        movements: [a.movement, ...s.movements],
      }
    case 'closeShift':
      return {
        ...s,
        shifts: s.shifts.map((sh) =>
          sh.id === a.shiftId
            ? { ...sh, closedAt: new Date().toISOString(), closedBy: a.by, countedMN: a.countedMN, countedUSD: a.countedUSD, expectedMN: a.expectedMN, expectedUSD: a.expectedUSD }
            : sh,
        ),
      }
    case 'openShift':
      return { ...s, shifts: [a.shift, ...s.shifts] }
    case 'logAlert':
      return { ...s, alerts: [a.alert, ...s.alerts] }
    case 'updateClient':
      return { ...s, clients: s.clients.map((c) => (c.id === a.id ? { ...c, ...a.patch } : c)) }
    case 'addCashOut':
      return { ...s, cashOuts: [a.out, ...s.cashOuts] }
    case 'addProduct':
      return { ...s, products: [a.product, ...s.products] }
    case 'updateProduct':
      return { ...s, products: s.products.map((p) => (p.id === a.id ? { ...p, ...a.patch } : p)) }
    case 'setSettings':
      return { ...s, settings: { ...s.settings, ...a.patch } }
    case 'addWorker':
      return { ...s, workers: [...s.workers, a.worker] }
    case 'updateWorker':
      return { ...s, workers: s.workers.map((w) => (w.id === a.id ? { ...w, ...a.patch } : w)) }
  }
}

export type LoginResult =
  | { ok: true; role: Worker['role'] }
  | { ok: false; reason: 'pin'; attemptsLeft: number; retryIn: number }
  | { ok: false; reason: 'locked'; retryIn: number }
  | { ok: false; reason: 'inactive' | 'nopin' }
  | { ok: false; reason: 'other-shift'; owner: string }
  | { ok: false; reason: 'error'; message: string }

const NO_SHIFT: Shift = { id: 'none', worker: '', openedAt: '1970-01-01T00:00:00.000Z', closedAt: '1970-01-01T00:00:00.000Z' }

const readLocks = (): Record<string, LockState> => {
  try { return JSON.parse(localStorage.getItem(LOCK_KEY) ?? '{}') } catch { return {} }
}
const writeLock = (id: string, l: LockState | null) => {
  try {
    const all = readLocks()
    if (l) all[id] = l; else delete all[id]
    localStorage.setItem(LOCK_KEY, JSON.stringify(all))
  } catch { /* sin almacenamiento */ }
}

interface Api extends State {
  today: string
  /** Quién está dentro (null = nadie). */
  session: Worker | null
  /** No hay ningún administrador con clave: es el primer uso. */
  needsSetup: boolean
  setupAdmin(name: string, pin: string): Promise<void>
  login(workerId: string, pin: string): Promise<LoginResult>
  logout(): void
  addWorker(input: { name: string; pin: string }): Promise<void>
  setWorkerPin(id: string, pin: string): Promise<void>
  setWorkerActive(id: string, active: boolean): void

  /** Último turno registrado (o uno vacío y cerrado si no hay ninguno). */
  shift: Shift
  /** ¿La persona que está dentro tiene su turno abierto? Solo entonces puede cobrar. */
  shiftOpen: boolean
  /** Turno abierto de OTRA persona (impide abrir uno nuevo). */
  otherOpenShift: Shift | null
  shiftMovements: Movement[]
  /** Salidas de caja del turno de quien está dentro (vacío si no tiene turno). */
  shiftCashOuts: CashOut[]
  /** Resumen de la caja del turno de quien está dentro (todo en cero si no tiene turno). */
  shiftSummary: ShiftSummary
  /** ¿La tasa USD es la de hoy? Sin ella no se puede cobrar en MN ni con tarjeta. */
  rateFresh: boolean
  setRate(rate: number): void
  /**
   * Cobros: `parts` es lo que se entrega en cada método (puede ser uno solo o varios combinados).
   * Devuelve null/false si no se pudo cobrar: turno cerrado, tasa vencida, o el pago no cubre el precio exacto.
   */
  enroll(input: { name: string; phone: string; carnet: string; plan: PlanId; parts: PartInput[]; change?: ChangeInput }): { client: Client; movement: Movement } | null
  pay(clientId: string, parts: PartInput[], change?: ChangeInput): Movement | null
  sell(items: { product: Product; qty: number }[], parts: PartInput[], change?: ChangeInput): Movement | null
  /** Registra que se avisó de un cobro a este cliente (al abrir su mensaje de WhatsApp). */
  logAlert(clientId: string): void
  /** Edita nombre, teléfono o plan (el carnet no cambia: es la identidad). */
  updateClient(id: string, patch: { name?: string; phone?: string; plan?: PlanId }): boolean
  /** Congela la membresía desde hoy: no se cobra ni se avisa. */
  freezeClient(id: string): void
  /** Reactiva: el vencimiento se corre los días que estuvo congelada. */
  unfreezeClient(id: string): void
  /** Registra un gasto o retiro de efectivo del turno. */
  addCashOut(input: { kind: CashOut['kind']; concept: string; mn: number; usd: number }): boolean
  /** El dueño cierra su turno; el administrador puede cerrar cualquiera. */
  closeShift(counted: { mn: number; usd: number }): void
  /** Abre el turno con el efectivo que hay en la caja (fondo inicial). */
  openShift(opening?: { mn: number; usd: number }): boolean
  addProduct(p: Omit<Product, 'id'> & { id?: string }): void
  updateProduct(id: string, patch: Partial<Product>): void
  setSettings(patch: Partial<Settings>): void
}

const Ctx = createContext<Api | null>(null)

export function GymProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initial)
  const [sessionId, setSessionId] = useState<string | null>(() => {
    try { return localStorage.getItem(SESSION_KEY) } catch { return null }
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* sin espacio o bloqueado */ }
  }, [state])
  useEffect(() => {
    try { sessionId ? localStorage.setItem(SESSION_KEY, sessionId) : localStorage.removeItem(SESSION_KEY) } catch { /* ignorar */ }
  }, [sessionId])

  // La sesión solo vale si la persona existe y sigue activa.
  const session = useMemo(() => {
    const w = state.workers.find((x) => x.id === sessionId)
    return w && w.active && w.pinHash ? w : null
  }, [state.workers, sessionId])

  const shift = state.shifts[0] ?? NO_SHIFT
  const shiftIsOpen = !shift.closedAt
  const shiftOpen = shiftIsOpen && !!session && session.role === 'worker' && shift.workerId === session.id
  const otherOpenShift = shiftIsOpen && shift.workerId !== session?.id ? shift : null
  const latestMovements = useMemo(() => state.movements.filter((m) => m.shiftId === shift.id), [state.movements, shift.id])
  // Cada quien ve solo la caja de SU turno; sin turno propio, todo en cero.
  const shiftMovements = useMemo(
    () => (session && shift.workerId === session.id ? latestMovements : []),
    [latestMovements, session, shift.workerId],
  )

  const mine = !!session && shift.workerId === session.id
  const latestCashOuts = useMemo(() => state.cashOuts.filter((o) => o.shiftId === shift.id), [state.cashOuts, shift.id])
  const shiftCashOuts = useMemo(() => (mine ? latestCashOuts : []), [latestCashOuts, mine])
  const shiftSummary = useMemo(
    () => summarize(shiftMovements, mine ? { opening: { mn: shift.openingMN ?? 0, usd: shift.openingUSD ?? 0 }, outs: shiftCashOuts } : {}),
    [shiftMovements, shiftCashOuts, mine, shift.openingMN, shift.openingUSD],
  )

  const mkMovement = useCallback(
    (m: Omit<Movement, 'id' | 'shiftId' | 'at' | 'workerId' | 'worker'>): Movement => ({
      ...m, id: crypto.randomUUID(), shiftId: shift.id, at: new Date().toISOString(),
      workerId: session?.id, worker: session?.name,
    }),
    [shift.id, session],
  )

  const api: Api = {
    ...state,
    today: today(),
    session,
    needsSetup: !state.workers.some((w) => w.role === 'admin' && w.pinHash),
    async setupAdmin(name, pin) {
      const salt = randomSalt()
      const w: Worker = { id: crypto.randomUUID(), name: name.trim(), role: 'admin', active: true, salt, pinHash: await hashPin(pin, salt) }
      dispatch({ type: 'addWorker', worker: w })
      setSessionId(w.id)
    },
    async login(workerId, pin) {
      const w = state.workers.find((x) => x.id === workerId)
      if (!w || !w.active) return { ok: false, reason: 'inactive' }
      if (!w.pinHash) return { ok: false, reason: 'nopin' }
      const now = Date.now()
      const lock = readLocks()[w.id] ?? { fails: 0, until: 0 }
      if (lock.until > now) return { ok: false, reason: 'locked', retryIn: secondsLeft(lock, now) }
      let good = false
      try { good = await verifyPin(pin, w.salt, w.pinHash) } catch (e) {
        return { ok: false, reason: 'error', message: e instanceof Error ? e.message : 'No se pudo verificar la clave.' }
      }
      if (!good) {
        const next = failLock(lock, Date.now())
        writeLock(w.id, next)
        return { ok: false, reason: 'pin', attemptsLeft: attemptsLeft(next), retryIn: secondsLeft(next, Date.now()) }
      }
      writeLock(w.id, null)
      if (w.role === 'worker' && shiftIsOpen && shift.workerId !== w.id) return { ok: false, reason: 'other-shift', owner: shift.worker }
      setSessionId(w.id)
      return { ok: true, role: w.role }
    },
    logout: () => setSessionId(null),
    async addWorker({ name, pin }) {
      const salt = randomSalt()
      dispatch({ type: 'addWorker', worker: { id: crypto.randomUUID(), name: name.trim(), role: 'worker', active: true, salt, pinHash: await hashPin(pin, salt) } })
    },
    async setWorkerPin(id, pin) {
      const salt = randomSalt()
      dispatch({ type: 'updateWorker', id, patch: { salt, pinHash: await hashPin(pin, salt) } })
      writeLock(id, null)
    },
    setWorkerActive(id, active) {
      if (id === session?.id) return // nadie se desactiva a sí mismo
      dispatch({ type: 'updateWorker', id, patch: { active } })
    },
    shift,
    shiftOpen,
    otherOpenShift,
    shiftMovements,
    shiftCashOuts,
    shiftSummary,
    rateFresh: rateIsFresh(state.settings, today()),
    setRate(rate) {
      if (!Number.isFinite(rate) || rate <= 0) return
      dispatch({ type: 'setSettings', patch: { usdRate: rate, usdRateDate: today() } })
    },
    enroll({ name, phone, carnet, plan, parts, change }) {
      const t = today()
      const price = state.settings.planPrices[plan]
      const pay = settle(price, parts, state.settings, t, change)
      if (!pay.ok || !shiftOpen) return null
      const client: Client = {
        id: crypto.randomUUID(), name: name.trim(), phone: phone.trim(), carnet: normalizeCarnet(carnet),
        plan, startDate: t, nextDue: renewalDate(t, plan, t),
      }
      const movement = mkMovement({
        kind: 'mensualidad', label: `Inscripción · ${client.name}`,
        amount: price, parts: pay.parts, change: pay.change, clientId: client.id,
      })
      dispatch({ type: 'enroll', client, movement })
      return { client, movement }
    },
    pay(clientId, parts, change) {
      const c = state.clients.find((x) => x.id === clientId)
      if (!c || !shiftOpen || isFrozen(c)) return null // una membresía congelada se reactiva antes de cobrar
      const price = state.settings.planPrices[c.plan]
      const pay = settle(price, parts, state.settings, today(), change)
      if (!pay.ok) return null
      const movement = mkMovement({
        kind: 'mensualidad', label: `Mensualidad · ${c.name}`,
        amount: price, parts: pay.parts, change: pay.change, clientId: c.id,
      })
      dispatch({ type: 'pay', clientId, nextDue: renewalDate(c.nextDue, c.plan, today()), movement })
      return movement
    },
    sell(items, parts, change) {
      if (!shiftOpen || items.length === 0) return null
      const total = Math.round(items.reduce((n, i) => n + i.product.price * i.qty, 0) * 100) / 100
      const pay = settle(total, parts, state.settings, today(), change)
      if (!pay.ok) return null
      const label = items.map((i) => (i.qty > 1 ? `${i.qty}× ` : '') + i.product.name).join(', ')
      const movement = mkMovement({ kind: 'venta', label: `Venta · ${label}`, amount: total, parts: pay.parts, change: pay.change })
      dispatch({ type: 'sell', items: items.map((i) => ({ id: i.product.id, qty: i.qty })), movement })
      return movement
    },
    logAlert(clientId) {
      const c = state.clients.find((x) => x.id === clientId)
      if (!session || !c || isFrozen(c)) return
      const st = dueInfo(c.nextDue, today()).state
      if (st === 'aldia') return // solo se avisa de lo vencido, lo de hoy y lo próximo
      dispatch({ type: 'logAlert', alert: { id: crypto.randomUUID(), clientId, at: new Date().toISOString(), state: st, worker: session.name, workerId: session.id } })
    },
    updateClient(id, patch) {
      if (!session) return false
      const clean: Partial<Client> = {}
      if (patch.name !== undefined) { if (patch.name.trim().length < 3) return false; clean.name = patch.name.trim() }
      if (patch.phone !== undefined) { if (patch.phone.replace(/\D/g, '').length < 7) return false; clean.phone = patch.phone.trim() }
      if (patch.plan !== undefined) clean.plan = patch.plan
      dispatch({ type: 'updateClient', id, patch: clean })
      return true
    },
    freezeClient(id) {
      const c = state.clients.find((x) => x.id === id)
      if (!session || !c || isFrozen(c)) return
      dispatch({ type: 'updateClient', id, patch: { frozenAt: today() } })
    },
    unfreezeClient(id) {
      const c = state.clients.find((x) => x.id === id)
      if (!session || !c || !isFrozen(c)) return
      dispatch({ type: 'updateClient', id, patch: { nextDue: unfreezeDue(c, today()), frozenAt: undefined } })
    },
    addCashOut({ kind, concept, mn, usd }) {
      const c = concept.trim()
      if (!shiftOpen || !session || c.length < 2 || !(mn > 0 || usd > 0) || mn < 0 || usd < 0) return false
      dispatch({
        type: 'addCashOut',
        out: { id: crypto.randomUUID(), shiftId: shift.id, kind, concept: c, mn: Math.round(mn), usd: Math.round(usd * 100) / 100, at: new Date().toISOString(), workerId: session.id, worker: session.name },
      })
      return true
    },
    closeShift(counted) {
      if (!shiftIsOpen || !session) return
      // Solo el dueño del turno o un administrador pueden cerrarlo.
      if (session.role !== 'admin' && shift.workerId !== session.id) return
      // El esperado sale del turno real (fondo inicial, cobros, vuelto y salidas), lo cierre quien lo cierre.
      const { expected } = summarize(latestMovements, { opening: { mn: shift.openingMN ?? 0, usd: shift.openingUSD ?? 0 }, outs: latestCashOuts })
      dispatch({ type: 'closeShift', shiftId: shift.id, by: session.name, countedMN: counted.mn, countedUSD: counted.usd, expectedMN: expected.mn, expectedUSD: expected.usd })
    },
    openShift(opening) {
      if (!session || session.role !== 'worker' || shiftIsOpen) return false
      const o = { mn: Math.max(0, Math.round(opening?.mn ?? 0)), usd: Math.max(0, Math.round((opening?.usd ?? 0) * 100) / 100) }
      dispatch({ type: 'openShift', shift: newShift(session, o) })
      return true
    },
    addProduct: (p) => dispatch({ type: 'addProduct', product: { ...p, id: p.id ?? crypto.randomUUID() } }),
    updateProduct: (id, patch) => dispatch({ type: 'updateProduct', id, patch }),
    setSettings: (patch) => dispatch({ type: 'setSettings', patch }),
  }
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useGym(): Api {
  const v = useContext(Ctx)
  if (!v) throw new Error('useGym fuera de GymProvider')
  return v
}
