import { useEffect, useRef, useState } from 'react'
import type { Location } from '../types'

// Nominatim rate limit: 1 req/s — debounce at 400ms
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function extractLocation(result: Record<string, unknown>): Location | null {
  const a = (result.address ?? {}) as Record<string, string>
  const city =
    a.city || a.town || a.municipality || a.village ||
    (result.class === 'place' || result.type === 'city' ? (result.name as string) : '') ||
    (result.class === 'boundary' && result.type === 'administrative' && result.name === (a.state || a.province || a.region) ? (result.name as string) : '') ||
    ''
  if (!city) return null
  const state = a.state || a.province || a.region || ''
  const country = a.country || ''
  const lat = parseFloat(result.lat as string)
  const lng = parseFloat(result.lon as string)
  const display = state ? `${city}, ${state}, ${country}` : `${city}, ${country}`
  return { city, state, country, lat, lng, display }
}

interface Props {
  value: Location | null
  onChange: (loc: Location | null) => void
  disabled?: boolean
}

export default function LocationAutocomplete({ value, onChange, disabled }: Props) {
  const [query, setQuery] = useState(value?.display ?? '')
  const [results, setResults] = useState<Location[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debouncedQuery = useDebounce(query, 400)

  useEffect(() => {
    if (debouncedQuery.length < 2) { setResults([]); return }
    if (value?.display === debouncedQuery) return

    let cancelled = false
    setLoading(true)

    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(debouncedQuery)}&format=json&limit=6&addressdetails=1&accept-language=en`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'AlumniNetwork/1.0' } }
    )
      .then((r) => r.json())
      .then((data: Record<string, unknown>[]) => {
        if (cancelled) return
        const seen = new Set<string>()
        const unique = data
          .map(extractLocation)
          .filter((loc): loc is Location => {
            if (!loc || seen.has(loc.display)) return false
            seen.add(loc.display)
            return true
          })
        setResults(unique)
        setOpen(true)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [debouncedQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(loc: Location) {
    setQuery(loc.display)
    setOpen(false)
    setResults([])
    onChange(loc)
  }

  return (
    <div ref={containerRef} className="location-autocomplete">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); if (!e.target.value) onChange(null) }}
        onFocus={() => results.length && setOpen(true)}
        placeholder="Nhập tên thành phố..."
        disabled={disabled}
        autoComplete="off"
      />
      {loading && <span className="location-loading">Searching…</span>}
      {open && results.length > 0 && (
        <ul className="location-dropdown">
          {results.map((loc, i) => (
            <li key={i} onMouseDown={() => select(loc)}>
              <svg className="location-pin" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 0 0 .723 0l.028-.015.071-.041a16.975 16.975 0 0 0 1.144-.742 19.58 19.58 0 0 0 2.683-2.282c1.944-2.013 3.713-4.912 3.713-8.327a8 8 0 1 0-16 0c0 3.415 1.769 6.314 3.713 8.327a19.58 19.58 0 0 0 2.682 2.282 16.975 16.975 0 0 0 1.144.742ZM12 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
              </svg>
              <span className="loc-city">{loc.city}</span>
              <span className="loc-country">{[loc.state, loc.country].filter(Boolean).join(', ')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
