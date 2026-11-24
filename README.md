# BASTO GYM

App de gestión de gimnasio (PWA). React + Vite + Tailwind; Supabase previsto para datos, login y fotos.

## Estado
- ✅ Pantallas del trabajador: Inicio, Inscribir, Pagos, Tienda, Cierre de caja.
- ⏳ Panel del administrador (escritorio).
- ⏳ Supabase: hoy los datos viven en `localStorage` (`src/data/store.tsx`), con datos de ejemplo.

## Desarrollo
```
npm install
npm run dev      # servidor local
npm test         # lógica de negocio (src/lib)
npm run build    # typecheck + build PWA
```

Moneda, país y precios de planes: `src/data/seed.ts` (`defaultSettings`).
