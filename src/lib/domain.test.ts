import { describe, expect, it } from 'vitest'
import { addMonths, addPlan } from './dates'
import { cashDifference, dueInfo, findByCarnet, isValidCarnet, normalizeCarnet, pendingClients, rateIsFresh, remainingUsd, renewalDate, settle, shiftDifference, summarize, whatsappLink } from './domain'
import type { Client, Movement } from './types'

describe('fechas', () => {
  it('no desborda meses cortos', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
  })
  it('suma planes', () => {
    expect(addPlan('2026-11-23', 'mes')).toBe('2026-12-23')
    expect(addPlan('2026-11-23', 'semana')).toBe('2026-11-30')
    expect(addPlan('2026-11-23', 'anio')).toBe('2027-11-23')
    expect(addPlan('2026-12-31', 'dia')).toBe('2027-01-01')
  })
})

describe('vencimientos', () => {
  const today = '2026-11-23'
  it('clasifica estados', () => {
    expect(dueInfo('2026-11-18', today)).toMatchObject({ state: 'vencido', text: 'Venció hace 5 días' })
    expect(dueInfo('2026-11-22', today).text).toBe('Venció hace 1 día')
    expect(dueInfo(today, today).state).toBe('hoy')
    expect(dueInfo('2026-11-25', today).state).toBe('pronto')
    expect(dueInfo('2026-12-23', today).state).toBe('aldia')
  })
  it('renueva desde hoy si ya venció y desde el vencimiento si paga antes', () => {
    expect(renewalDate('2026-11-18', 'mes', today)).toBe('2026-12-23')
    expect(renewalDate('2026-11-28', 'mes', today)).toBe('2026-12-28')
    expect(renewalDate(today, 'mes', today)).toBe('2026-12-23')
  })
  it('ordena pendientes por atraso', () => {
    const mk = (id: string, nextDue: string) => ({ id, nextDue }) as Client
    const r = pendingClients([mk('a', '2026-11-23'), mk('b', '2026-11-18'), mk('c', '2026-12-01')], today)
    expect(r.map((c) => c.id)).toEqual(['b', 'a'])
  })
})

describe('pagos (uno solo o combinados)', () => {
  const s = { usdRate: 120, usdRateDate: '2026-11-24' }
  const today = '2026-11-24'
  const stale = { usdRate: 120, usdRateDate: '2026-11-23' }

  it('USD cubre el precio sin necesitar tasa', () => {
    const r = settle(25, [{ method: 'usd', paid: 25 }], { usdRate: 0, usdRateDate: '' }, today)
    expect(r.ok && r.parts).toEqual([{ method: 'usd', paid: 25, usd: 25 }])
  })
  it('MN y tarjeta se cobran a la tasa del día', () => {
    const r = settle(25, [{ method: 'mn', paid: 3000 }], s, today)
    expect(r.ok && r.parts).toEqual([{ method: 'mn', paid: 3000, rate: 120, usd: 25 }])
    expect(settle(20, [{ method: 'tarjeta', paid: 2450 }], { usdRate: 122.5, usdRateDate: today }, today).ok).toBe(true)
  })
  it('permite combinar USD, MN y tarjeta', () => {
    // 20 USD = 10 USD + 600 MN (5 USD) + 600 MN con tarjeta (5 USD)
    const r = settle(20, [{ method: 'usd', paid: 10 }, { method: 'mn', paid: 600 }, { method: 'tarjeta', paid: 600 }], s, today)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.parts.map((p) => p.method)).toEqual(['usd', 'mn', 'tarjeta'])
      expect(r.parts.reduce((n, p) => n + p.usd, 0)).toBeCloseTo(20, 6)
    }
  })
  it('exige cubrir el precio completo: avisa cuánto falta', () => {
    const r = settle(20, [{ method: 'usd', paid: 10 }, { method: 'mn', paid: 600 }], s, today)
    expect(r).toMatchObject({ ok: false, reason: 'short' })
    expect(!r.ok && r.remaining).toBeCloseTo(5, 6)
  })
  it('rechaza pasarse (el vuelto no se registra)', () => {
    expect(settle(20, [{ method: 'usd', paid: 30 }], s, today)).toMatchObject({ ok: false, reason: 'over' })
  })
  it('tolera medio peso de redondeo al repartir', () => {
    // 20 USD a tasa 130 = 2600 MN. 7 USD + 1690 MN = 7 + 13 = 20 exacto; 1689.7 MN redondeado a 1690
    expect(settle(20, [{ method: 'usd', paid: 7 }, { method: 'mn', paid: 1690 }], { usdRate: 130, usdRateDate: today }, today).ok).toBe(true)
    // 1 peso menos ya es faltante real
    expect(settle(20, [{ method: 'usd', paid: 7 }, { method: 'mn', paid: 1688 }], { usdRate: 130, usdRateDate: today }, today)).toMatchObject({ ok: false, reason: 'short' })
  })
  it('nunca acepta MN ni tarjeta con una tasa de otro día; USD sí', () => {
    expect(settle(25, [{ method: 'mn', paid: 3000 }], stale, today)).toMatchObject({ ok: false, reason: 'rate' })
    expect(settle(25, [{ method: 'usd', paid: 10 }, { method: 'tarjeta', paid: 1800 }], stale, today)).toMatchObject({ ok: false, reason: 'rate' })
    expect(settle(25, [{ method: 'usd', paid: 25 }], stale, today).ok).toBe(true)
    expect(rateIsFresh(s, today)).toBe(true)
    expect(rateIsFresh(stale, today)).toBe(false)
  })
  it('un pago vacío o con montos inválidos no se acepta', () => {
    expect(settle(25, [], s, today)).toMatchObject({ ok: false, reason: 'empty' })
    expect(settle(25, [{ method: 'usd', paid: 0 }, { method: 'mn', paid: NaN }], s, today)).toMatchObject({ ok: false, reason: 'empty' })
  })
  it('calcula lo que falta en vivo', () => {
    expect(remainingUsd(20, [{ method: 'usd', paid: 5 }], 120)).toBe(15)
    expect(remainingUsd(20, [{ method: 'mn', paid: 1200 }], 120)).toBe(10)
    expect(remainingUsd(20, [{ method: 'usd', paid: 25 }], 120)).toBe(-5)
  })
})

describe('caja', () => {
  it('detecta cuadre, faltante y sobrante sin errores de decimales', () => {
    expect(cashDifference(0.3, 0.1 + 0.2)).toEqual({ status: 'cuadra', amount: 0 })
    expect(cashDifference(90, 100)).toEqual({ status: 'faltante', amount: 10 })
    expect(cashDifference(105.5, 100)).toEqual({ status: 'sobrante', amount: 5.5 })
  })
  it('separa los cajones, también cuando un cobro se paga combinado', () => {
    const one = (kind: Movement['kind'], amount: number, method: 'usd' | 'mn' | 'tarjeta', paid: number) =>
      ({ kind, amount, parts: [{ method, paid, usd: amount }] }) as Movement
    const mixed = { kind: 'mensualidad', amount: 20, parts: [{ method: 'usd', paid: 10, usd: 10 }, { method: 'mn', paid: 600, usd: 5 }, { method: 'tarjeta', paid: 600, usd: 5 }] } as Movement
    const s = summarize([one('mensualidad', 20, 'mn', 2400), one('venta', 25, 'tarjeta', 3000), one('mensualidad', 20, 'usd', 20), one('venta', 0.5, 'usd', 0.5), mixed])
    expect(s.memberships).toEqual({ count: 3, total: 60 })
    expect(s.sales).toEqual({ count: 2, total: 25.5 })
    expect(s.expected).toEqual({ usd: 30.5, mn: 3000, card: 3600 })
    expect(s.total).toBe(85.5)
  })
  it('cuadra cada cajón por separado', () => {
    const base = { expectedMN: 2460, expectedUSD: 20 }
    expect(shiftDifference({ ...base, countedMN: 2460, countedUSD: 20 }).balanced).toBe(true)
    const d = shiftDifference({ ...base, countedMN: 2360, countedUSD: 21 })
    expect(d.balanced).toBe(false)
    expect(d.mn).toEqual({ status: 'faltante', amount: 100 })
    expect(d.usd).toEqual({ status: 'sobrante', amount: 1 })
  })
})

describe('whatsapp', () => {
  it('agrega el prefijo de país una sola vez', () => {
    expect(whatsappLink('55 1234 5678', '52', 'hola')).toBe('https://wa.me/525512345678?text=hola')
    expect(whatsappLink('+52 55 1234 5678', '52', 'hola')).toBe('https://wa.me/525512345678?text=hola')
  })
})

describe('carnet', () => {
  it('normaliza espacios, puntos y guiones', () => {
    expect(normalizeCarnet(' 12.345-678 a ')).toBe('12345678A')
  })
  it('valida longitud y caracteres', () => {
    expect(isValidCarnet('90010112345')).toBe(true)
    expect(isValidCarnet('1234')).toBe(false)
    expect(isValidCarnet('1234567890123456')).toBe(false)
    expect(isValidCarnet('12 34$5')).toBe(false)
    expect(isValidCarnet('')).toBe(false)
  })
  it('detecta duplicados aunque cambie el formato', () => {
    const cs = [{ id: 'a', carnet: '12345678A' }] as Client[]
    expect(findByCarnet(cs, '12.345-678 a')?.id).toBe('a')
    expect(findByCarnet(cs, '99999')).toBeUndefined()
  })
})
