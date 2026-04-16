export interface Post {
  id: string
  name: string
  class: string
  secondary_class: string | null
  school_year: string
  city: string
  country: string
  caption: string | null
  image_url: string | null
  lat: number | null
  lng: number | null
  instagram: string | null
  facebook: string | null
  linkedin: string | null
  created_at: string
}

export interface Location {
  city: string
  state: string
  country: string
  lat: number
  lng: number
  display: string
}

export interface Filters {
  class: string
  school_year: string
  city: string
  country: string
}

export interface FormFields {
  name: string
  class: string
  school_year: string
  location: Location | null
  caption: string
  image: File | null
  instagram: string
  facebook: string
  linkedin: string
}

export type SocialPlatform = 'linkedin' | 'facebook' | 'instagram'
