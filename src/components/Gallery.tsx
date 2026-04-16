import { useEffect, useMemo, useState } from 'react'
import GlobeView from './GlobeView'
import FilterBar from './FilterBar'
import PostCard from './PostCard'
import type { Post, Filters } from '../types'

const PAGE_SIZE = 12

function buildPageItems(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const WING = 1 // pages shown on each side of current
  const left  = Math.max(1, current - WING)
  const right = Math.min(total, current + WING)

  const items: (number | '...')[] = []

  // Left edge: always show first 3 if near start
  const leftEdge = Math.min(2, left - 1)
  for (let i = 1; i <= leftEdge; i++) items.push(i)
  if (left > leftEdge + 1) items.push('...')

  // Middle window around current
  for (let i = left; i <= right; i++) items.push(i)

  // Right edge: always show last 3 if near end
  const rightEdge = Math.max(total - 1, right + 1)
  if (right < rightEdge - 1) items.push('...')
  for (let i = rightEdge; i <= total; i++) items.push(i)

  return items
}

interface Props {
  posts: Post[]
  loading: boolean
}

export default function Gallery({ posts, loading }: Props) {
  const [filters, setFilters] = useState<Filters>({ class: '', school_year: '', city: '', country: '' })
  const [focusedPost, setFocusedPost] = useState<Post | null>(null)
  const [page, setPage] = useState(1)
  const [pageInput, setPageInput] = useState('')

  useEffect(() => {
    if (focusedPost) window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [focusedPost])

  function handleFilterChange(next: Filters) {
    setFilters(next)
    setPage(1)
  }

  const filtered = useMemo(
    () => posts.filter((p) => {
      if (filters.class && p.class !== filters.class && p.secondary_class !== filters.class) return false
      if (filters.school_year && p.school_year !== filters.school_year) return false
      if (filters.country && p.country !== filters.country) return false
      if (filters.city && p.city !== filters.city) return false
      return true
    }),
    [posts, filters]
  )

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handlePageInputSubmit(e: React.FormEvent) {
    e.preventDefault()
    const num = parseInt(pageInput, 10)
    if (!isNaN(num) && num >= 1 && num <= totalPages) setPage(num)
    setPageInput('')
  }

  if (loading) return <div className="status-message">Đang tải...</div>

  if (!posts.length) {
    return <div className="status-message">Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ!</div>
  }

  return (
    <div className="gallery">
      <section className="map-section">
        <GlobeView
          posts={filtered}
          allPosts={posts}
          focusedPost={focusedPost}
          onFocusPost={setFocusedPost}
          onClusterFilter={({ city, country }) => handleFilterChange({ ...filters, city, country })}
        />
      </section>

      <section className="grid-section">
        <FilterBar posts={posts} filters={filters} onChange={handleFilterChange} />
        <p className="connection-count">
          {filtered.length === posts.length
            ? <><strong>{posts.length}</strong> người nhà</>
            : <><strong>{filtered.length}</strong> / {posts.length} người nhà</>}
        </p>

        {filtered.length === 0 ? (
          <div className="status-message">Không có bài viết nào phù hợp với bộ lọc.</div>
        ) : (
          <>
            <div className="grid">
              {paginated.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  focused={focusedPost?.id === post.id}
                  onFocus={setFocusedPost}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button className="page-btn" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</button>
                {buildPageItems(page, totalPages).map((item, i) =>
                  item === '...' ? (
                    <span key={`ellipsis-${i}`} className="page-ellipsis">…</span>
                  ) : (
                    <button
                      key={item}
                      className={page === item ? 'page-btn active' : 'page-btn'}
                      onClick={() => setPage(item)}
                    >
                      {item}
                    </button>
                  )
                )}
                <button className="page-btn" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>›</button>
                <form className="page-jump" onSubmit={handlePageInputSubmit}>
                  <input
                    type="number"
                    className="page-jump-input"
                    min={1}
                    max={totalPages}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    placeholder="Trang"
                    aria-label="Go to page"
                  />
                  <button type="submit" className="page-btn">→</button>
                </form>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
