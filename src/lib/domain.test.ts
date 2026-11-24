import { describe, expect, it } from 'vitest'
import { addMonths, addPlan } from './dates'
import { cashDifference, dueInfo, pendingClients, renewalDate, summarize, whatsappLink } from './domain'
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

describe('caja', () => {
  it('detecta cuadre, faltante y sobrante sin errores de decimales', () => {
    expect(cashDifference(0.3, 0.1 + 0.2)).toEqual({ status: 'cuadra', amount: 0 })
    expect(cashDifference(90, 100)).toEqual({ status: 'faltante', amount: 10 })
    expect(cashDifference(105.5, 100)).toEqual({ status: 'sobrante', amount: 5.5 })
  })
  it('resume por método y tipo', () => {
    const m = (kind: Movement['kind'], amount: number, method: Movement['method']) =>
      ({ kind, amount, method }) as Movement
    const s = summarize([m('mensualidad', 600, 'efectivo'), m('venta', 450, 'tarjeta'), m('mensualidad', 600, 'transferencia')])
    expect(s.memberships).toEqual({ count: 2, total: 1200 })
    expect(s.sales).toEqual({ count: 1, total: 450 })
    expect(s.byMethod).toEqual({ efectivo: 600, tarjeta: 450, transferencia: 600 })
    expect(s.total).toBe(1650)
  })
})

describe('whatsapp', () => {
  it('agrega el prefijo de país una sola vez', () => {
    expect(whatsappLink('55 1234 5678', '52', 'hola')).toBe('https://wa.me/525512345678?text=hola')
    expect(whatsappLink('+52 55 1234 5678', '52', 'hola')).toBe('https://wa.me/525512345678?text=hola')
  })
})
