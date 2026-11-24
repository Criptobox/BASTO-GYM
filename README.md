# BASTO GYM

App de gestión de gimnasio (PWA). React + Vite + Tailwind; Supabase previsto para datos, login y fotos.

## Estado
- ✅ Pantallas del trabajador: Inicio, Inscribir, Pagos, Tienda, Cierre de caja.
- ✅ Panel del administrador (`/admin`): Resumen, Clientes, Productos, Cierres y Ajustes. Sin login todavía.
- ⏳ Supabase: hoy los datos viven en `localStorage` (`src/data/store.tsx`), con datos de ejemplo.

## Desarrollo
```
npm install
npm run dev      # servidor local
npm test         # lógica de negocio (src/lib)
npm run build    # typecheck + build PWA
```

## Monedas
- Los **precios están en USD**. Se cobra en **USD**, **MN** o **tarjeta** (la tarjeta se cobra en MN).
- MN y tarjeta = precio × **tasa del día** (MN por 1 USD), a pesos enteros. La tasa se fija cada día en Inicio o en Ajustes;
  si no es de hoy, MN y tarjeta quedan bloqueados (nunca se cobra con una tasa vieja). Cada cobro guarda la tasa usada.
- La caja tiene **dos cajones de efectivo** (MN y USD) más la tarjeta; el cierre cuenta y cuadra cada uno por separado.
- Valores de ejemplo (tasa, precios, país): `src/data/seed.ts` (`defaultSettings`).

## Fotos (WebP + GitHub)
- Solo hay fotos de **productos** → GitHub (rama `media`, servidas por jsDelivr). Los clientes no llevan foto: solo nombre, carnet y teléfono.
- El navegador convierte a **WebP** antes de subir (`src/lib/image.ts`; en Safari usa un módulo WASM de respaldo). El JPG original no se sube ni se guarda.
- Subir a GitHub desde el navegador expondría el token, así que lo hace la función `supabase/functions/upload-image`:
  solo acepta WebP reales (≤ 300 KB), solo en `products/`, y solo del usuario con `app_metadata.role = "admin"`.
  Cada foto tiene nombre único (`products/<id>-<timestamp>.webp`); al reemplazarla se borra la anterior.

### Puesta en marcha
1. Crear la rama de medios: `git checkout --orphan media && git rm -rf . && git commit --allow-empty -m "media" && git push origin media`
2. Crear un token fine-grained de GitHub **solo para este repo**, permiso *Contents: Read and write*.
3. `supabase secrets set GITHUB_TOKEN=... GITHUB_REPO=criptobox/basto-gym ALLOWED_ORIGIN=https://tu-dominio`
4. `supabase functions deploy upload-image`
5. Poner la URL de la función en `.env` → `VITE_MEDIA_UPLOAD_URL` (ver `.env.example`).
6. jsDelivr solo sirve repos **públicos**: está bien para fotos de productos. Nunca subas datos de clientes a un repo.

Sin `VITE_MEDIA_UPLOAD_URL` (desarrollo) las fotos se guardan localmente como data URL.
