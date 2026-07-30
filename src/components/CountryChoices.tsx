import type { CountryOption } from '../types'

type CountryChoicesProps = {
  options: CountryOption[]
  onChoose: (code: string, name: string) => void
}

function flagEmoji(code: string) {
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map((letter) => 127_397 + letter.charCodeAt(0)),
  )
}

export function CountryChoices({ options, onChoose }: CountryChoicesProps) {
  return (
    <div className="country-choices">
      {options.map(({ code, name }) => (
        <button
          className="country-choice"
          type="button"
          key={code}
          aria-label={`Choose ${name}`}
          onClick={() => onChoose(code, name)}
        >
          <span aria-hidden="true">{flagEmoji(code)}</span>
          <strong>{name}</strong>
        </button>
      ))}
    </div>
  )
}
