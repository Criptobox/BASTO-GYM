import { blobToDataURL } from '../lib/image'

/**
 * Fotos de productos → GitHub (rama `media`), vía la función `upload-image` de Supabase,
 * que es la única que tiene el token de GitHub. El navegador nunca ve ese token.
 *
 * Sin VITE_MEDIA_UPLOAD_URL (desarrollo) la foto se guarda como data URL local.
 */
const ENDPOINT = import.meta.env.VITE_MEDIA_UPLOAD_URL as string | undefined

export const remoteMedia = Boolean(ENDPOINT)

async function call(method: 'POST' | 'DELETE', body: unknown, accessToken?: string) {
  const res = await fetch(ENDPOINT!, {
    method,
    headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? `Error ${res.status} al subir la imagen`)
  return data as { url: string }
}

const toBase64 = async (b: Blob) => (await blobToDataURL(b)).split(',')[1]

/** Nombre único e inmutable: evita la caché del CDN al reemplazar fotos. */
export const productPhotoPath = (productId: string) => `products/${productId}-${Date.now()}.webp`

export async function uploadProductPhoto(webp: Blob, productId: string, accessToken?: string): Promise<string> {
  if (webp.type !== 'image/webp') throw new Error('La imagen debe ser WebP')
  if (!ENDPOINT) return blobToDataURL(webp)
  const { url } = await call('POST', { path: productPhotoPath(productId), contentBase64: await toBase64(webp) }, accessToken)
  return url
}

/** Borra la foto anterior al reemplazarla o al eliminar el producto. */
export async function deleteProductPhoto(url: string | undefined, accessToken?: string): Promise<void> {
  if (!url || !ENDPOINT || url.startsWith('data:')) return
  const path = new URL(url).pathname.match(/products\/[^/]+\.webp$/)?.[0]
  if (path) await call('DELETE', { path }, accessToken)
}
