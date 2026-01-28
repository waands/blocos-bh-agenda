import type { ReactNode } from "react"

import type { BaseEvent } from "@/lib/eventTypes"

import { EventRow } from "@/components/event-row"

type ListPanelProps = {
  isLoading: boolean
  listTimedEvents: BaseEvent[]
  listUndeterminedEvents: BaseEvent[]
  getStatus: (id: string) => string | null
  onStatusChange: (id: string, status: string | null) => void
}

export function ListPanel({
  isLoading,
  listTimedEvents,
  listUndeterminedEvents,
  getStatus,
  onStatusChange,
}: ListPanelProps) {
  const formatDayLabel = (date: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "short",
    }).format(date)

  const formatTimeLabel = (date: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)

  const timedRows: ReactNode[] = []
  let lastDayKey = ""
  let lastTimeLabel = ""

  listTimedEvents.forEach((event) => {
    const start = new Date(event.starts_at)
    const dayKey = start.toISOString().slice(0, 10)
    const timeLabel = formatTimeLabel(start)

    if (dayKey !== lastDayKey) {
      timedRows.push(
        <div key={`day-${dayKey}`} className="pt-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-foreground">
              {formatDayLabel(start)}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-primary/30 via-border to-transparent" />
          </div>
        </div>
      )
      lastDayKey = dayKey
      lastTimeLabel = ""
    }

    if (timeLabel !== lastTimeLabel) {
      timedRows.push(
        <div key={`time-${dayKey}-${timeLabel}`} className="pt-2">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {timeLabel}
            </span>
            <div className="h-px flex-1 bg-border/70" />
          </div>
        </div>
      )
      lastTimeLabel = timeLabel
    }

    timedRows.push(
      <EventRow
        key={event.id}
        event={event}
        status={getStatus(event.id)}
        onStatusChange={(status) => onStatusChange(event.id, status)}
      />
    )
  })

  const undeterminedRows: ReactNode[] = []
  let lastUndeterminedDayKey = ""

  listUndeterminedEvents.forEach((event) => {
    const start = new Date(event.starts_at)
    const dayKey = start.toISOString().slice(0, 10)

    if (dayKey !== lastUndeterminedDayKey) {
      undeterminedRows.push(
        <div key={`undetermined-day-${dayKey}`} className="pt-4">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-foreground">
              {formatDayLabel(start)}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-muted-foreground/40 via-border to-transparent" />
          </div>
        </div>
      )
      lastUndeterminedDayKey = dayKey
    }

    undeterminedRows.push(
      <EventRow
        key={event.id}
        event={event}
        status={getStatus(event.id)}
        onStatusChange={(status) => onStatusChange(event.id, status)}
      />
    )
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            Carregando eventos...
          </p>
        ) : null}
        {timedRows}
        {listTimedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum evento com horário definido nesta semana.
          </p>
        ) : null}
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 pt-2">
          <span className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Horário a divulgar
          </span>
          <div className="h-px flex-1 bg-border/70" />
        </div>
        {listUndeterminedEvents.length > 0 ? (
          undeterminedRows
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum evento sem horário definido.
          </p>
        )}
      </div>
    </div>
  )
}
