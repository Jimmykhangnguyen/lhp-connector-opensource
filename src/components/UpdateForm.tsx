import { useState } from 'react'
import LocationAutocomplete from './LocationAutocomplete'
import SocialInputs from './SocialInputs'
import { safeSocialUrl, countWords } from '../social'
import type { FormFields, SocialPlatform } from '../types'

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

type UpdateField = 'location' | 'caption' | 'social' | 'photo'

const UPDATE_FIELDS: { value: UpdateField; label: string }[] = [
  { value: 'location', label: 'Địa điểm' },
  { value: 'caption', label: 'Lời nhắn' },
  { value: 'social', label: 'Mạng xã hội' },
  { value: 'photo', label: 'Ảnh' },
]

export default function UpdateForm() {
  const [fields, setFields] = useState<FormFields>(INITIAL)
  const [updateField, setUpdateField] = useState<UpdateField | ''>('')
  const [preview, setPreview] = useState<string | null>(null)
  const [status, setStatus] = useState<{ type: 'error' | null; message: string }>({ type: null, message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

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
    if (!updateField) return 'Vui lòng chọn thông tin muốn cập nhật.'
    if (updateField === 'location' && !fields.location) return 'Vui lòng chọn địa điểm.'
    if (updateField === 'social') {
      if (fields.linkedin.trim() && !safeSocialUrl(fields.linkedin, 'linkedin')) return 'LinkedIn link không hợp lệ (phải là linkedin.com/...).'
      if (fields.facebook.trim() && !safeSocialUrl(fields.facebook, 'facebook')) return 'Facebook link không hợp lệ (phải là facebook.com/...).'
      if (fields.instagram.trim() && !safeSocialUrl(fields.instagram, 'instagram')) return 'Instagram link không hợp lệ (phải là instagram.com/...).'
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const error = validate()
    if (error) { setStatus({ type: 'error', message: error }); return }

    setSubmitting(true)
    setStatus({ type: null, message: '' })

    try {
      const formData = new FormData()
      formData.append('name', fields.name.trim())
      formData.append('class', fields.class.trim())
      formData.append('school_year', fields.school_year.replace(YEAR_DASH_RE, '-').trim())

      if (updateField === 'location' && fields.location) {
        formData.append('city', fields.location.city)
        formData.append('country', fields.location.country)
        formData.append('lat', String(fields.location.lat))
        formData.append('lng', String(fields.location.lng))
      }
      if (updateField === 'caption') formData.append('caption', fields.caption.trim())
      if (updateField === 'social') {
        if (fields.linkedin.trim()) formData.append('linkedin', fields.linkedin.trim())
        if (fields.facebook.trim()) formData.append('facebook', fields.facebook.trim())
        if (fields.instagram.trim()) formData.append('instagram', fields.instagram.trim())
      }
      if (updateField === 'photo' && fields.image) formData.append('image', fields.image)

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-update`, { method: 'POST', body: formData })
      const result = await res.json() as { error?: string }
      if (!res.ok) throw new Error(result.error)

      setDone(true)
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Something went wrong. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="submit-success">
        <div className="submit-success-icon">✓</div>
        <h2>Yêu cầu cập nhật đã được gửi!</h2>
        <span className="submit-success-highlight">Thông tin của bạn sẽ sớm được cập nhật!</span>
      </div>
    )
  }

  return (
    <form className="submit-form" onSubmit={handleSubmit} noValidate>
      <h2>Cập nhật thông tin</h2>
      <p className="form-subtitle">Điền tên, lớp, và niên khoá để xác định bài của bạn.</p>

      <div className="form-row two-col">
        <label>
          <span>Tên <span className="form-required">*</span></span>
          <input type="text" value={fields.name} onChange={(e) => set('name', e.target.value)} placeholder="Nguyễn Văn A" disabled={submitting} />
        </label>
        <label>
          <span>Lớp <span className="form-required">*</span></span>
          <input type="text" value={fields.class} onChange={(e) => set('class', e.target.value)} placeholder="CA1, CTR-N,..." disabled={submitting} />
        </label>
      </div>

      <div className="form-row">
        <label>
          <span>Niên khoá <span className="form-required">*</span></span>
          <input
            type="text"
            value={fields.school_year}
            onChange={(e) => set('school_year', e.target.value)}
            onBlur={(e) => set('school_year', e.target.value.replace(YEAR_DASH_RE, '-').trim())}
            placeholder="2020-2023"
            disabled={submitting}
          />
        </label>
      </div>

      <div className="form-row">
        <label>
          <span>Tôi muốn cập nhật <span className="form-required">*</span></span>
          <select value={updateField} onChange={(e) => setUpdateField(e.target.value as UpdateField)} disabled={submitting}>
            <option value="">-- Chọn thông tin --</option>
            {UPDATE_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </label>
      </div>

      {updateField === 'location' && (
        <div className="form-row">
          <label>
            <span>Địa điểm mới <span className="form-required">*</span></span>
            <LocationAutocomplete value={fields.location} onChange={(loc) => set('location', loc)} disabled={submitting} />
          </label>
        </div>
      )}

      {updateField === 'caption' && (
        <div className="form-row form-row--tight">
          <label>
            <span>Lời nhắn mới <span className="form-required">*</span></span>
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
      )}

      {updateField === 'social' && (
        <div className="form-row">
          <label>
            <span>Mạng xã hội mới</span>
            <SocialInputs
              linkedin={fields.linkedin}
              facebook={fields.facebook}
              instagram={fields.instagram}
              onChange={(key: SocialPlatform, value: string) => set(key, value)}
              disabled={submitting}
            />
          </label>
        </div>
      )}

      {updateField === 'photo' && (
        <div className="form-row">
          <label>
            <span>Ảnh mới <span className="form-required">*</span></span>
            <div className="file-input-wrap">
              <input type="file" accept="image/*" onChange={handleImageChange} disabled={submitting} id="update-photo-input" />
              <label htmlFor="update-photo-input" className="file-btn">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
                </svg>
                {fields.image ? fields.image.name : 'Chọn ảnh'}
              </label>
            </div>
          </label>
          {preview && <img src={preview} alt="Preview" className="img-preview" />}
        </div>
      )}

      {status.message && <div className={`form-status ${status.type}`}>{status.message}</div>}

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
      </button>
    </form>
  )
}
