import { useRef, useState } from 'react'
import LocationAutocomplete from './LocationAutocomplete'
import SocialInputs from './SocialInputs'
import { safeSocialUrl, countWords } from '../social'
import type { Post, FormFields, SocialPlatform } from '../types'

const INITIAL: FormFields = {
  name: '',
  class: '',
  school_year: '',
  location: null,
  caption: '',
  image: null,
  instagram: '',
  facebook: '',
  linkedin: '',
}

const MAX_WORDS = 30
const YEAR_DASH_RE = /\s*[-–]\s*/g

function SuggestInput({
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  suggestions,
}: {
  value: string
  onChange: (v: string) => void
  onBlur?: React.FocusEventHandler<HTMLInputElement>
  placeholder: string
  disabled: boolean
  suggestions: string[]
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const filtered = suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value)

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setOpen(false)
      onBlur?.(e)
    }
  }

  return (
    <div ref={containerRef} className="suggest-wrap" onBlur={handleBlur}>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <ul className="location-dropdown">
          {filtered.map((s) => (
            <li key={s} onMouseDown={() => { onChange(s); setOpen(false) }}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface Props {
  onSuccess: () => void
  posts?: Post[]
}

export default function SubmitForm({ onSuccess, posts = [] }: Props) {
  const [fields, setFields] = useState<FormFields>(INITIAL)
  const [preview, setPreview] = useState<string | null>(null)
  const [status, setStatus] = useState<{ type: 'error' | 'success' | null; message: string }>({ type: null, message: '' })
  const [submitting, setSubmitting] = useState(false)

  function set<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setFields((f) => ({ ...f, [key]: value }))
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    set('image', file)
    setPreview(URL.createObjectURL(file))
  }

  function validate(): string | null {
    if (!fields.name.trim()) return 'Vui lòng điền tên của bạn.'
    if (!fields.class.trim()) return 'Vui lòng điền lớp của bạn.'
    if (!fields.school_year.trim()) return 'Vui lòng điền niên khoá của bạn.'
    if (!fields.location) return 'Vui lòng điền vị trí của bạn.'
    if (!fields.caption.trim()) return 'Vui lòng thêm một lời nhắn.'
    if (fields.linkedin.trim() && !safeSocialUrl(fields.linkedin, 'linkedin')) return 'LinkedIn link không hợp lệ (phải là linkedin.com/...).'
    if (fields.facebook.trim() && !safeSocialUrl(fields.facebook, 'facebook')) return 'Facebook link không hợp lệ (phải là facebook.com/...).'
    if (fields.instagram.trim() && !safeSocialUrl(fields.instagram, 'instagram')) return 'Instagram link không hợp lệ (phải là instagram.com/...).'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const error = validate()
    if (error) { setStatus({ type: 'error', message: error }); return }

    setSubmitting(true)
    setStatus({ type: null, message: '' })

    try {
      const { city, country, lat, lng } = fields.location!
      const formData = new FormData()
      formData.append('name', fields.name.trim())
      formData.append('class', fields.class.trim())
      formData.append('school_year', fields.school_year.replace(YEAR_DASH_RE, '-').trim())
      formData.append('city', city)
      formData.append('country', country)
      formData.append('lat', String(lat))
      formData.append('lng', String(lng))
      formData.append('caption', fields.caption.trim())
      if (fields.instagram.trim()) formData.append('instagram', fields.instagram.trim())
      if (fields.facebook.trim()) formData.append('facebook', fields.facebook.trim())
      if (fields.linkedin.trim()) formData.append('linkedin', fields.linkedin.trim())
      if (fields.image) formData.append('image', fields.image)

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-post`, { method: 'POST', body: formData })
      const result = await res.json() as { error?: string; requiresApproval?: boolean }
      if (!res.ok) throw new Error(result.error)

      setFields(INITIAL)
      setPreview(null)
      if (result.requiresApproval) {
        setStatus({ type: 'success', message: '' })
      } else {
        onSuccess()
      }
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Something went wrong. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const classSuggestions = [...new Set(posts.map((p) => p.class))].sort()
  const yearSuggestions = [...new Set(posts.map((p) => p.school_year))].sort()

  if (status.type === 'success') {
    return (
      <div className="submit-success">
        <div className="submit-success-icon">✓</div>
        <h2>Lời nhắn đã được gửi và đang chờ duyệt!</h2>
        <span className="submit-success-highlight">Chào mừng bạn đã trở về nhà 🏠</span>
      </div>
    )
  }

  return (
    <form className="submit-form" onSubmit={handleSubmit} noValidate>
      <h2>Tham gia mạng lưới</h2>
      <p className="form-subtitle">Hãy kể cho chúng tớ về hành trình của bạn!</p>

      <div className="form-row">
        <label>
          <span>Tên <span className="form-required">*</span></span>
          <input type="text" value={fields.name} onChange={(e) => set('name', e.target.value)} placeholder="Nguyễn Văn A" disabled={submitting} />
        </label>
      </div>

      <div className="form-row two-col">
        <label>
          <span>Lớp <span className="form-required">*</span></span>
          <SuggestInput value={fields.class} onChange={(v) => set('class', v)} placeholder="CA1, CTR-N, CSU-Đ,..." disabled={submitting} suggestions={classSuggestions} />
        </label>
        <label>
          <span>Niên khoá <span className="form-required">*</span></span>
          <SuggestInput
            value={fields.school_year}
            onChange={(v) => set('school_year', v)}
            onBlur={(e) => set('school_year', e.target.value.replace(YEAR_DASH_RE, '-').trim())}
            placeholder="2020-2023"
            disabled={submitting}
            suggestions={yearSuggestions}
          />
        </label>
      </div>

      <div className="form-row">
        <label>
          <span>Địa điểm hiện tại <span className="form-required">*</span></span>
          <LocationAutocomplete value={fields.location} onChange={(loc) => set('location', loc)} disabled={submitting} />
        </label>
      </div>

      <div className="form-row" style={{ marginBottom: 0 }}>
        <label>
          <span>Một lời nhắn nho nhỏ <span className="form-required">*</span></span>
          <textarea
            value={fields.caption}
            onChange={(e) => { if (countWords(e.target.value) <= MAX_WORDS) set('caption', e.target.value) }}
            placeholder="Dạo này bạn thế nào?"
            rows={3}
            disabled={submitting}
          />
        </label>
        <span className="word-count">{countWords(fields.caption)} / {MAX_WORDS} từ</span>
      </div>

      <div className="form-row">
        <label>
          <span>Mạng xã hội <span className="form-optional">(tuỳ chọn)</span></span>
          <SocialInputs
            linkedin={fields.linkedin}
            facebook={fields.facebook}
            instagram={fields.instagram}
            onChange={(key: SocialPlatform, value: string) => set(key, value)}
            disabled={submitting}
          />
        </label>
      </div>

      <div className="form-row">
        <label>
          <span>Ảnh <span className="form-optional">(tuỳ chọn)</span></span>
          <div className="file-input-wrap">
            <input type="file" accept="image/*" onChange={handleImageChange} disabled={submitting} id="photo-input" />
            <label htmlFor="photo-input" className="file-btn">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
              </svg>
              {fields.image ? fields.image.name : 'Chọn ảnh'}
            </label>
          </div>
        </label>
        {preview && <img src={preview} alt="Preview" className="img-preview" />}
      </div>

      {status.message && <div className={`form-status ${status.type}`}>{status.message}</div>}

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? 'Đang gửi...' : 'Gửi'}
      </button>
    </form>
  )
}
