/**
 * Logo oficial de BASTO GYM (brand/logo-original.jpg), ya sobre su tarjeta blanca: public/logo.webp.
 * Los iconos se regeneran con `python3 scripts/build-logo.py`.
 */
export function LogoMark({ size = 64, className }: { size?: number; className?: string }) {
  return <img src="/logo.webp" width={size} height={size} alt="BASTO GYM" className={className} />
}

export function Logo({ name = 'BASTO GYM', size = 44 }: { name?: string; size?: number }) {
  return (
    <span className="inline-flex items-center gap-3">
      <LogoMark size={size} />
      <span className="text-xl font-extrabold leading-none tracking-tight">{name}</span>
    </span>
  )
}
