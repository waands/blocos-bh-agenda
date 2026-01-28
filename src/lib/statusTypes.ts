export type EventStatus = "not_going" | "maybe" | "sure"

export type StatusRecord = {
  status: EventStatus
  updatedAt: string
}

export type OverrideRecord = {
  hidden?: boolean
  notes?: string
  updatedAt: string
}
