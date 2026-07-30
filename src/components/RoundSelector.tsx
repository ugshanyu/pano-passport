import type { RoundCount } from '../lib/game'
import { ROUND_OPTIONS } from '../lib/game'

type RoundSelectorProps = {
  value: RoundCount
  disabled?: boolean
  onChange: (value: RoundCount) => void
}

export function RoundSelector({
  value,
  disabled = false,
  onChange,
}: RoundSelectorProps) {
  return (
    <fieldset className="round-selector" disabled={disabled}>
      <legend>Trip length</legend>
      <div>
        {ROUND_OPTIONS.map((roundCount) => (
          <button
            type="button"
            className={value === roundCount ? 'is-selected' : ''}
            aria-pressed={value === roundCount}
            onClick={() => onChange(roundCount)}
            key={roundCount}
          >
            <strong>{roundCount}</strong>
            <span>rounds</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}
