/**
 * Convierte cualquier imagen (JPG, PNG, HEIC que el navegador sepa abrir…) a WebP
 * en el propio dispositivo. El archivo original nunca se sube ni se guarda:
 * solo existe en memoria mientras se convierte.
 */
export interface WebPOptions {
  /** Lado mayor máximo en píxeles. */
  maxSide: number
  /** 0–1 */
  quality: number
}

export const PRODUCT_PHOTO: WebPOptions = { maxSide: 800, quality: 0.8 }
export const CLIENT_PHOTO: WebPOptions = { maxSide: 320, quality: 0.8 }

export function fitSize(w: number, h: number, maxSide: number) {
  const s = Math.min(1, maxSide / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * s)), height: Math.max(1, Math.round(h * s)) }
}

const canvasToBlob = (c: HTMLCanvasElement, type: string, q: number) =>
  new Promise<Blob | null>((res) => c.toBlob(res, type, q))

export async function toWebP(file: Blob, { maxSide, quality }: WebPOptions): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const { width, height } = fitSize(bmp.width, bmp.height, maxSide)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bmp, 0, 0, width, height)
  bmp.close()

  // Chrome, Edge y Firefox codifican WebP de forma nativa.
  const native = await canvasToBlob(canvas, 'image/webp', quality)
  if (native && native.type === 'image/webp') return native

  // Safari (iPhone) devuelve PNG: se codifica con un módulo WASM cargado solo si hace falta.
  const { encode } = await import('@jsquash/webp')
  const buf = await encode(ctx.getImageData(0, 0, width, height), { quality: Math.round(quality * 100) })
  return new Blob([buf], { type: 'image/webp' })
}

export function blobToDataURL(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result as string)
    r.onerror = () => rej(r.error)
    r.readAsDataURL(b)
  })
}

export const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`
