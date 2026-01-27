export type BaseEvent = {
  id: string
  title: string
  starts_at: string
  ends_at: string | null
  location?: string | null
  description?: string | null
  ritmos?: string | null
  tamanho_publico?: string | null
  lgbt?: string | null
  all_day: boolean
}
