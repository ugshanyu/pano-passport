import { getData } from 'country-list'
import { useMemo } from 'react'

type CountryPickerProps = {
  value: string
  onChange: (code: string, name: string) => void
}

export function CountryPicker({ value, onChange }: CountryPickerProps) {
  const countries = useMemo(
    () => [...getData()].sort((a, b) => a.name.localeCompare(b.name)),
    [],
  )

  return (
    <label className="country-picker">
      <span>Your answer</span>
      <select
        value={value}
        onChange={(event) => {
          const country = countries.find(({ code }) => code === event.target.value)
          if (country) onChange(country.code, country.name)
        }}
      >
        <option value="">Choose a country…</option>
        {countries.map(({ code, name }) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
    </label>
  )
}
