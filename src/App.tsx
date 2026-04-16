import { useEffect, useRef, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { supabase } from './supabase'
import SubmitForm from './components/SubmitForm'
import UpdateForm from './components/UpdateForm'
import Gallery from './components/Gallery'
import type { Post } from './types'

const SUBMISSIONS_OPEN = true

const LIEN_KET = [
  { label: 'lehongphong.org', href: 'https://lehongphong.org/' },
  { label: 'Diễn đàn', href: 'https://forum.lehongphong.org/' },
]

type Page = 'gallery' | 'submit' | 'update'

export default function App() {
  const [page, setPage] = useState<Page>('gallery')
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [linksOpen, setLinksOpen] = useState(false)
  const [mobileLinksOpen, setMobileLinksOpen] = useState(false)
  const desktopRef = useRef<HTMLDivElement>(null)
  const mobileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (desktopRef.current && !desktopRef.current.contains(e.target as Node)) setLinksOpen(false)
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) setMobileLinksOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function fetchPosts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select('id, name, class, secondary_class, school_year, city, country, caption, image_url, lat, lng, instagram, facebook, linkedin, created_at')
      .order('created_at', { ascending: false })
      .limit(10000)

    if (!error) setPosts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchPosts() }, [])

  function handleSuccess() {
    setPage('gallery')
    fetchPosts()
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="header-inner">
          <div className="header-title">
            <h1>The Pétrus Ký - Le Hong Phong Network</h1>
            <p className="header-sub">Mạng lưới Cựu học sinh Trường Pétrus Ký - Lê Hồng Phong</p>
          </div>
          <nav className="site-nav desktop-nav">
            <button className={page === 'gallery' ? 'nav-btn active' : 'nav-btn'} onClick={() => setPage('gallery')}>
              Mạng lưới
            </button>
            {SUBMISSIONS_OPEN && (
              <button className={page === 'submit' ? 'nav-btn active' : 'nav-btn'} onClick={() => setPage('submit')}>
                Tham gia
              </button>
            )}
            <button className={page === 'update' ? 'nav-btn active' : 'nav-btn'} onClick={() => setPage('update')}>
              Chỉnh sửa
            </button>
            <div className="nav-dropdown" ref={desktopRef}>
              <button className="nav-btn nav-dropdown-trigger" onClick={() => setLinksOpen(o => !o)}>
                Liên kết
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style={{ marginLeft: 4, opacity: 0.6, transition: 'transform 0.15s', transform: linksOpen ? 'rotate(180deg)' : 'none' }}>
                  <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z" clipRule="evenodd"/>
                </svg>
              </button>
              {linksOpen && (
                <div className="nav-dropdown-menu">
                  {LIEN_KET.map(({ label, href }) => (
                    <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="nav-dropdown-item" onClick={() => setLinksOpen(false)}>
                      {label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main className="main-content">
        {page === 'gallery' || !SUBMISSIONS_OPEN ? (
          <Gallery posts={posts} loading={loading} />
        ) : page === 'update' ? (
          <UpdateForm />
        ) : (
          <SubmitForm onSuccess={handleSuccess} posts={posts} />
        )}
      </main>

      <footer className="site-footer">
        <p>The PK-LHP Network · Petrus Ký · Lê Hồng Phong · Est. 1927</p>
        <p>Built By Jimmy Nguyen CA1 20-23, with love ❤️</p>
      </footer>

      <nav className="mobile-nav" aria-label="Main navigation">
        <button className={page === 'gallery' ? 'mobile-nav-btn active' : 'mobile-nav-btn'} onClick={() => setPage('gallery')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M11.47 3.84a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 1-1.06 1.06L12 5.69l-8.16 7.9a.75.75 0 0 1-1.06-1.06l8.69-8.69Z"/>
            <path d="M12 6.94l6 5.81V19.5A1.5 1.5 0 0 1 16.5 21h-3v-4.5h-3V21h-3A1.5 1.5 0 0 1 6 19.5v-6.75l6-5.81Z"/>
          </svg>
          <span>Mạng lưới</span>
        </button>
        {SUBMISSIONS_OPEN && (
          <button className={page === 'submit' ? 'mobile-nav-btn active' : 'mobile-nav-btn'} onClick={() => setPage('submit')}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 9a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V15a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V9Z" clipRule="evenodd"/>
            </svg>
            <span>Tham gia</span>
          </button>
        )}
        <button className={page === 'update' ? 'mobile-nav-btn active' : 'mobile-nav-btn'} onClick={() => setPage('update')}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
            <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z"/>
            <path d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z"/>
          </svg>
          <span>Chỉnh sửa</span>
        </button>
        <div className="mobile-nav-dropdown" ref={mobileRef}>
          <button className="mobile-nav-btn" onClick={() => setMobileLinksOpen(o => !o)}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
              <path d="M15.75 2.25H21a.75.75 0 0 1 .75.75v5.25a.75.75 0 0 1-1.5 0V4.81L8.03 17.03a.75.75 0 0 1-1.06-1.06L19.19 3.75h-3.44a.75.75 0 0 1 0-1.5Z"/>
              <path d="M3.75 6.75a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v6.75a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5V9.75a1.5 1.5 0 0 1 1.5-1.5H10.5a.75.75 0 0 0 0-1.5H3.75Z"/>
            </svg>
            <span>Liên kết</span>
          </button>
          {mobileLinksOpen && (
            <div className="mobile-nav-dropdown-menu">
              {LIEN_KET.map(({ label, href }) => (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="mobile-nav-dropdown-item" onClick={() => setMobileLinksOpen(false)}>
                  {label}
                </a>
              ))}
            </div>
          )}
        </div>
      </nav>

      <Analytics />
    </div>
  )
}
