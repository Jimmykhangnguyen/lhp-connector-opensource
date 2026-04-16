import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Globe from 'react-globe.gl'
import type { GlobeMethods } from 'react-globe.gl'
import Supercluster from 'supercluster'
import type { ClusterFeature, PointFeature } from 'supercluster'
import { thumbnailUrl } from '../cloudinary'
import SocialLinks from './SocialLinks'
import type { Post } from '../types'

const SCHOOL = { lat: 10.763774, lng: 106.681434 }
const MIN_ARC_DISTANCE_DEG = 3
const ARC_SWEEP_MS = 2400
const ARC_DRAWN_MS = 2550

interface Arc {
  id: string
  startLat: number
  startLng: number
  endLat: number
  endLng: number
}

interface ClusterPoint {
  lat: number
  lng: number
  isCluster: boolean
  count: number
  post: Post | null
  clusterId: number | undefined
  id: string | number
}

interface CityDensity {
  city: string
  country: string
  lat: number
  lng: number
  count: number
}

type GlobeMode = 'connections' | 'density'

// Supercluster type guard

type ScFeature = ClusterFeature<Supercluster.AnyProps> | PointFeature<Post>

function isClusterFeature(f: ScFeature): f is ClusterFeature<Supercluster.AnyProps> {
  return f.properties !== null && 'cluster' in f.properties
}

function esc(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function arcAltitude(d: Arc): number {
  const dlat = d.endLat - d.startLat
  const dlng = d.endLng - d.startLng
  const dist = Math.sqrt(dlat * dlat + dlng * dlng)
  return Math.min(0.08 + dist * 0.0018, 0.6)
}

function altToZoom(altitude: number): number {
  return Math.round(Math.max(0, Math.min(12, 8 - Math.log2(altitude + 0.3) * 3)))
}

function makeHomeElement(): HTMLElement {
  const el = document.createElement('div')
  el.className = 'globe-home-marker'
  el.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
      <path d="M11.47 3.84a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 1-1.06 1.06L12 5.69l-8.16 7.9a.75.75 0 0 1-1.06-1.06l8.69-8.69Z"/>
      <path d="M12 6.94l6 5.81V19.5A1.5 1.5 0 0 1 16.5 21h-3v-4.5h-3V21h-3A1.5 1.5 0 0 1 6 19.5v-6.75l6-5.81Z"/>
    </svg>
    <span>Nhà</span>
  `
  return el
}

interface Props {
  posts: Post[]
  allPosts: Post[]
  focusedPost: Post | null
  onFocusPost: (post: Post | null) => void
  onClusterFilter: (filter: { city: string; country: string }) => void
}

export default function GlobeView({ posts, allPosts, focusedPost, onFocusPost, onClusterFilter }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const modeRef = useRef<GlobeMode>('connections')

  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })
  const [arcsDone, setArcsDone] = useState(false)
  const [clusterPosts, setClusterPosts] = useState<Post[]>([])
  const [clusterIndex, setClusterIndex] = useState(0)
  const [scZoom, setScZoom] = useState(2)
  const [mode, setMode] = useState<GlobeMode>('connections')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Keep ref in sync with state so callbacks always read the latest mode
  modeRef.current = mode

  const isDensity = mode === 'density'

  useEffect(() => {
    function measure() {
      if (!containerRef.current) return
      const w = containerRef.current.offsetWidth
      const isMobile = w < 640
      setDimensions({
        width: w,
        height: isFullscreen
          ? window.innerHeight
          : isMobile ? Math.min(w * 0.95, 420) : Math.min(w * 0.58, 540),
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (containerRef.current) ro.observe(containerRef.current)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
  }, [isFullscreen])

  // ── Globe initialisation (runs once after mount) ─────────────────────────

  useEffect(() => {
    if (!globeRef.current) return
    const globe = globeRef.current
    const controls = globe.controls()
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.2
    controls.enableZoom = true
    globe.pointOfView({ lat: 15, lng: 108, altitude: 2 }, 1400)

    const arcTimer = setTimeout(() => setArcsDone(true), ARC_DRAWN_MS)

    function onCameraChange() {
      const { altitude } = globe.pointOfView()
      globe.controls().autoRotate = altitude > 1.3
      if (modeRef.current === 'density') return
      setScZoom(altToZoom(altitude))
    }
    controls.addEventListener('change', onCameraChange)

    return () => {
      clearTimeout(arcTimer)
      controls.removeEventListener('change', onCameraChange)
    }
  }, [])

  // ── Focus a post on the globe ────────────────────────────────────────────

  useEffect(() => {
    if (!globeRef.current || focusedPost?.lat == null) return
    globeRef.current.pointOfView({ lat: focusedPost.lat, lng: focusedPost.lng ?? undefined, altitude: 0.4 }, 900)
  }, [focusedPost])

  // ── Arc animation reset on mode/filter change ────────────────────────────

  useEffect(() => {
    onFocusPost(null)
    if (mode !== 'connections') return
    setArcsDone(false)
    const t = setTimeout(() => setArcsDone(true), ARC_DRAWN_MS)
    return () => clearTimeout(t)
  }, [mode, posts]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Escape key exits fullscreen ──────────────────────────────────────────

  useEffect(() => {
    if (!isFullscreen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setIsFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFullscreen])

  // ── Data derivations ─────────────────────────────────────────────────────

  const postsWithCoords = useMemo(
    () => posts.filter((p) => p.lat != null && p.lng != null),
    [posts]
  )

  const cityDensity = useMemo<CityDensity[]>(() => {
    const map: Record<string, CityDensity> = {}
    allPosts.filter((p) => p.lat != null && p.lng != null).forEach((p) => {
      const key = `${p.city}||${p.country}`
      if (!map[key]) map[key] = { city: p.city, country: p.country, lat: p.lat!, lng: p.lng!, count: 0 }
      map[key].count++
    })
    return Object.values(map)
  }, [allPosts])

  const scIndex = useMemo(() => {
    const idx = new Supercluster<Post, Supercluster.AnyProps>({ radius: 55, maxZoom: 12 })
    idx.load(postsWithCoords.map((p) => ({
      type: 'Feature' as const,
      properties: p,
      geometry: { type: 'Point' as const, coordinates: [p.lng!, p.lat!] },
    })))
    return idx
  }, [postsWithCoords])

  const clusterPoints = useMemo<ClusterPoint[]>(() => {
    if (isDensity) return []
    return (scIndex.getClusters([-180, -85, 180, 85], scZoom) as ScFeature[]).map((c) => {
      const cluster = isClusterFeature(c)
      return {
        lat: c.geometry.coordinates[1],
        lng: c.geometry.coordinates[0],
        isCluster: cluster,
        count: cluster ? c.properties.point_count : 1,
        post: cluster ? null : (c as PointFeature<Post>).properties,
        clusterId: cluster ? c.properties.cluster_id : undefined,
        id: cluster ? `cluster-${c.properties.cluster_id}` : (c as PointFeature<Post>).properties.id,
      }
    })
  }, [scIndex, scZoom, isDensity])

  const arcs = useMemo<Arc[]>(() =>
    postsWithCoords
      .filter((p) => {
        const dlat = p.lat! - SCHOOL.lat
        const dlng = p.lng! - SCHOOL.lng
        return Math.sqrt(dlat * dlat + dlng * dlng) > MIN_ARC_DISTANCE_DEG
      })
      .map((p) => ({ id: p.id, startLat: SCHOOL.lat, startLng: SCHOOL.lng, endLat: p.lat!, endLng: p.lng! })),
    [postsWithCoords]
  )

  // ── Cluster click ────────────────────────────────────────────────────────

  const handlePointClick = useCallback((point: object) => {
    const p = point as ClusterPoint
    const globe = globeRef.current
    if (!globe) return

    if (p.isCluster) {
      const clusterLeaves = (scIndex.getLeaves(p.clusterId!, Infinity) as PointFeature<Post>[]).map((l) => l.properties)
      setClusterPosts(clusterLeaves)
      setClusterIndex(0)
      onFocusPost({ ...clusterLeaves[0] })
      const { altitude } = globe.pointOfView()
      globe.controls().autoRotate = false
      globe.pointOfView({ lat: p.lat, lng: p.lng, altitude: altitude * 0.35 }, 700)
    } else {
      setClusterPosts([])
      onFocusPost(focusedPost?.id === p.post?.id ? null : p.post)
    }
  }, [focusedPost, onFocusPost, scIndex])

  // ── Cluster nav helpers ──────────────────────────────────────────────────

  function navigateCluster(delta: number) {
    const i = clusterIndex + delta
    setClusterIndex(i)
    onFocusPost(clusterPosts[i])
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className={`globe-wrap${isFullscreen ? ' globe-wrap--fullscreen' : ''}`}>
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="https://unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="https://unpkg.com/three-globe/example/img/night-sky.png"
        atmosphereColor="#4a8fd4"
        atmosphereAltitude={0.25}
        onGlobeClick={() => { onFocusPost(null); setClusterPosts([]) }}

        htmlElementsData={[SCHOOL]}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={0.02}
        htmlElement={isDensity ? undefined : makeHomeElement}

        arcsData={isDensity ? [] : arcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor={() => ['rgba(244,185,66,0.9)', 'rgba(230,57,70,0.9)']}
        arcAltitude={(d) => arcAltitude(d as Arc)}
        arcStroke={0.2}
        arcCurveResolution={58}
        arcDashLength={1.05}
        arcDashGap={arcsDone ? 0 : 1}
        arcDashInitialGap={arcsDone ? 0 : 1}
        arcDashAnimateTime={arcsDone ? 0 : ARC_SWEEP_MS}

        pointsData={isDensity ? [] : clusterPoints}
        pointLat="lat"
        pointLng="lng"
        pointColor={(p) => {
          const cp = p as ClusterPoint
          return cp.isCluster ? '#f4b942' : cp.post?.id === focusedPost?.id ? '#f4b942' : '#e63946'
        }}
        pointRadius={0.1}
        pointAltitude={0.002}
        pointLabel={(d) => {
          const cp = d as ClusterPoint
          return cp.isCluster
            ? `<div class="globe-tooltip"><strong>${cp.count} người nhà</strong><span>Scroll to zoom in</span></div>`
            : `<div class="globe-tooltip">
                <strong>${esc(cp.post!.name)}</strong>
                <span>${esc(cp.post!.city)}, ${esc(cp.post!.country)}</span>
                <span class="globe-tt-tag">${esc(cp.post!.class)} · ${esc(cp.post!.school_year)}</span>
               </div>`
        }}
        onPointClick={handlePointClick}

        labelsData={isDensity ? cityDensity : []}
        labelLat="lat"
        labelLng="lng"
        labelText={(d) => (d as CityDensity).city}
        labelSize={0.12}
        labelColor={() => '#f4b942'}
        labelDotRadius={0.15}
        labelAltitude={0.005}
        labelResolution={2}
        labelLabel={(d) => {
          const cd = d as CityDensity
          return `<div class="globe-tooltip"><strong>${esc(cd.city)}, ${esc(cd.country)}</strong><span>${cd.count} người nhà</span></div>`
        }}
        onLabelClick={(d) => { const cd = d as CityDensity; onClusterFilter({ city: cd.city, country: cd.country }) }}
      />

      <button
        className="globe-fullscreen-btn"
        onClick={() => setIsFullscreen((fs) => !fs)}
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M3.22 3.22a.75.75 0 0 1 1.06 0l3.97 3.97V4.5a.75.75 0 0 1 1.5 0V9a.75.75 0 0 1-.75.75H4.5a.75.75 0 0 1 0-1.5h2.69L3.22 4.28a.75.75 0 0 1 0-1.06Zm17.56 0a.75.75 0 0 1 0 1.06l-3.97 3.97h2.69a.75.75 0 0 1 0 1.5H15a.75.75 0 0 1-.75-.75V4.5a.75.75 0 0 1 1.5 0v2.69l3.97-3.97a.75.75 0 0 1 1.06 0ZM3.75 15c0-.414.336-.75.75-.75h4.5A.75.75 0 0 1 9.75 15v4.5a.75.75 0 0 1-1.5 0v-2.69l-3.97 3.97a.75.75 0 0 1-1.06-1.06l3.97-3.97H4.5a.75.75 0 0 1-.75-.75Zm10.5 0a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-2.69l3.97 3.97a.75.75 0 0 1-1.06 1.06l-3.97-3.97v2.69a.75.75 0 0 1-1.5 0V15Z" clipRule="evenodd"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path fillRule="evenodd" d="M15 3.75a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0V5.56l-3.97 3.97a.75.75 0 1 1-1.06-1.06l3.97-3.97h-2.69a.75.75 0 0 1-.75-.75Zm-12 0A.75.75 0 0 1 3.75 3h4.5a.75.75 0 0 1 0 1.5H5.56l3.97 3.97a.75.75 0 0 1-1.06 1.06L4.5 5.56v2.69a.75.75 0 0 1-1.5 0v-4.5Zm11.47 11.78a.75.75 0 1 1 1.06-1.06l3.97 3.97v-2.69a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1 0-1.5h2.69l-3.97-3.97Zm-4.94-1.06a.75.75 0 0 1 0 1.06L5.56 19.5h2.69a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75v-4.5a.75.75 0 0 1 1.5 0v2.69l3.97-3.97a.75.75 0 0 1 1.06 0Z" clipRule="evenodd"/>
          </svg>
        )}
      </button>

      <div className="globe-mode-toggle">
        <button className={mode === 'connections' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('connections')} title="Show connections from home">
          Liên kết
        </button>
        <button className={mode === 'density' ? 'mode-btn active' : 'mode-btn'} onClick={() => setMode('density')} title="Show alumni density by city">
          Thành phố
        </button>
      </div>

      {!isDensity && focusedPost && (
        <>
          <div className="globe-card-popup globe-card-popup--desktop">
            <img src={thumbnailUrl(focusedPost.image_url)} alt={focusedPost.name} />
            <div className="globe-card-info">
              {focusedPost.caption && <p className="globe-card-caption">{focusedPost.caption}</p>}
              <span className="globe-card-name">{focusedPost.name}</span>
              <div className="globe-card-tags">
                <span className="tag">{focusedPost.class}</span>
                {focusedPost.secondary_class && <span className="tag">{focusedPost.secondary_class}</span>}
                <span className="tag">{focusedPost.school_year}</span>
              </div>
              <p className="globe-card-loc">{focusedPost.city}, {focusedPost.country}</p>
              <SocialLinks post={focusedPost} iconSize={13} />
              {clusterPosts.length > 1 && (
                <div className="globe-card-nav" onClick={(e) => e.stopPropagation()}>
                  <button className="globe-card-nav-btn" disabled={clusterIndex === 0} onClick={() => navigateCluster(-1)}>‹</button>
                  <span className="globe-card-nav-count">{clusterIndex + 1} / {clusterPosts.length}</span>
                  <button className="globe-card-nav-btn" disabled={clusterIndex === clusterPosts.length - 1} onClick={() => navigateCluster(1)}>›</button>
                </div>
              )}
            </div>
          </div>

          <div className="globe-card-bar">
            <img src={thumbnailUrl(focusedPost.image_url)} alt={focusedPost.name} className="globe-bar-thumb" />
            <div className="globe-bar-info">
              <span className="globe-card-name">{focusedPost.name}</span>
              <div className="globe-card-tags">
                <span className="tag">{focusedPost.class}</span>
                {focusedPost.secondary_class && <span className="tag">{focusedPost.secondary_class}</span>}
                <span className="tag">{focusedPost.school_year}</span>
              </div>
              <p className="globe-card-loc">{focusedPost.city}, {focusedPost.country}</p>
            </div>
            {clusterPosts.length > 1 ? (
              <div className="globe-bar-cluster-nav" onClick={(e) => e.stopPropagation()}>
                <button disabled={clusterIndex === 0} onClick={() => navigateCluster(-1)}>‹</button>
                <span>{clusterIndex + 1}/{clusterPosts.length}</span>
                <button disabled={clusterIndex === clusterPosts.length - 1} onClick={() => navigateCluster(1)}>›</button>
              </div>
            ) : (
              <span className="globe-bar-close" onClick={() => { onFocusPost(null); setClusterPosts([]) }}>✕</span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
