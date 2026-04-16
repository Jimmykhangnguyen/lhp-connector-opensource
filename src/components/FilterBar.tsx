import type { Post, Filters } from '../types'

interface Props {
  posts: Post[]
  filters: Filters
  onChange: (filters: Filters) => void
}

export default function FilterBar({ posts, filters, onChange }: Props) {
  const classes = [...new Set(posts.flatMap((p) => p.secondary_class ? [p.class, p.secondary_class] : [p.class]))].sort()
  const years = [...new Set(posts.map((p) => p.school_year))].sort()
  const countries = [...new Set(posts.map((p) => p.country))].filter(Boolean).sort()

  const countryPosts = filters.country ? posts.filter((p) => p.country === filters.country) : posts
  const cityOptions = [
    ...new Map(
      countryPosts.map((p) => [`${p.city}||${p.country}`, { city: p.city, country: p.country }])
    ).values(),
  ].sort((a, b) => a.city.localeCompare(b.city))

  const cityKey = filters.city ? `${filters.city}||${filters.country}` : ''
  const hasFilter = filters.class || filters.school_year || filters.country || filters.city

  function handleCountryChange(country: string) {
    const cityStillValid = !filters.city || filters.country === country
    onChange({ ...filters, country, city: cityStillValid ? filters.city : '' })
  }

  function handleCityChange(value: string) {
    if (!value) { onChange({ ...filters, city: '' }); return }
    const [city, country] = value.split('||')
    onChange({ ...filters, city, country })
  }

  return (
    <div className="filter-bar">
      <select value={filters.class} onChange={(e) => onChange({ ...filters, class: e.target.value })} aria-label="Lọc theo lớp">
        <option value="">Tất cả các lớp</option>
        {classes.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <select value={filters.school_year} onChange={(e) => onChange({ ...filters, school_year: e.target.value })} aria-label="Lọc theo niên khoá">
        <option value="">Tất cả niên khoá</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>

      <select value={filters.country} onChange={(e) => handleCountryChange(e.target.value)} aria-label="Lọc theo quốc gia">
        <option value="">Tất cả quốc gia</option>
        {countries.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <select value={cityKey} onChange={(e) => handleCityChange(e.target.value)} aria-label="Lọc theo thành phố">
        <option value="">Tất cả thành phố</option>
        {cityOptions.map(({ city, country }) => (
          <option key={`${city}||${country}`} value={`${city}||${country}`}>{city}</option>
        ))}
      </select>

      {hasFilter && (
        <button
          className="btn-ghost btn-gold"
          onClick={() => onChange({ class: '', school_year: '', city: '', country: '' })}
        >
          Xoá bộ lọc
        </button>
      )}
    </div>
  )
}
