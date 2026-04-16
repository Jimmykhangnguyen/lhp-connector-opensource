import { useState } from 'react'
import { thumbnailUrl } from '../cloudinary'
import SocialLinks from './SocialLinks'
import type { Post } from '../types'

const CAPTION_LIMIT = 150

interface Props {
  post: Post
  focused: boolean
  onFocus: (post: Post | null) => void
}

export default function PostCard({ post, focused, onFocus }: Props) {
  const [expanded, setExpanded] = useState(false)
  const caption = post.caption ?? ''
  const isLong = caption.length > CAPTION_LIMIT + 30
  const displayedCaption = isLong && !expanded ? caption.slice(0, caption.lastIndexOf(' ', CAPTION_LIMIT)).trimEnd() + '…' : caption

  return (
    <article
      className={`card${focused ? ' card--focused' : ''}`}
      onClick={() => onFocus(focused ? null : post)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onFocus(focused ? null : post)}
      aria-pressed={focused}
    >
      <div className="card-img-wrap">
        <img src={thumbnailUrl(post.image_url)} alt={`Photo from ${post.name}`} loading="lazy" />
      </div>
      <div className="card-body">
        {caption && (
          <p className="card-caption">
            {displayedCaption + " "}
            {isLong && (
              <button
                className="caption-toggle"
                onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v) }}
              >
                {expanded ? ' Ẩn bớt' : ' Xem thêm'}
              </button>
            )}
          </p>
        )}
        <div className="card-meta">
          <span className="card-name">{post.name}</span>
          <span className="card-tags">
            {post.secondary_class && <span className="tag">{post.secondary_class}</span>}
            <span className="tag">{post.class}</span>
            <span className="tag">{post.school_year}</span>
          </span>
        </div>
        <p className="card-location">{post.city}, {post.country}</p>
        <SocialLinks post={post} />
      </div>
    </article>
  )
}
