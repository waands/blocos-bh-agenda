export type EventStatus = "maybe" | "going" | "sure" | "not_going"

export type StatusRecord = {
  status: EventStatus
  updatedAt: string
}

export type OverrideRecord = {
  hidden?: boolean
  notes?: string
  updatedAt: string
}
