export interface RawNewsInput {
  source: string          // 'espn' | 'hoopshype' | 'realgm' | 'reddit'
  externalId?: string
  url: string
  title: string
  excerpt?: string
  imageUrl?: string
  publishedAt: Date
}
