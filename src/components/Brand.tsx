import { Earth } from 'lucide-react'

type BrandProps = {
  compact?: boolean
  inverted?: boolean
}

export function Brand({ compact = false, inverted = false }: BrandProps) {
  return (
    <div
      className={`brand ${compact ? 'brand--compact' : ''} ${
        inverted ? 'brand--inverted' : ''
      }`}
      aria-label="WorldGuessr"
    >
      <span className="brand__mark" aria-hidden="true">
        <Earth size={compact ? 18 : 23} strokeWidth={2.4} />
      </span>
      <span>
        World<span>Guessr</span>
      </span>
    </div>
  )
}
