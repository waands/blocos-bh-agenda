"use client"

import { EventDetailsSheet } from "@/components/event-details-sheet"
import type { BaseEvent } from "@/lib/eventTypes"
import type { EventStatus } from "@/lib/statusTypes"

function formatEventSummary(event: BaseEvent) {
  const start = new Date(event.starts_at)
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(start)

  if (event.all_day) {
    return `${dateLabel} · Horário a divulgar`
  }

  const timeLabel = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(start)

  return `${dateLabel} · ${timeLabel}`
}

type EventRowProps = {
  event: BaseEvent
  status: EventStatus | null
  onStatusChange: (status: EventStatus | null) => void
}

export function EventRow({ event, status, onStatusChange }: EventRowProps) {
  return (
    <EventDetailsSheet
      event={event}
      status={status}
      onStatusChange={onStatusChange}
      trigger={
        <button
          type="button"
          data-status={status ?? "none"}
          className="flex w-full flex-col gap-2 rounded-2xl border border-border/80 border-l-4 border-l-primary/30 bg-gradient-to-r from-background via-background to-muted/30 px-5 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-muted/40 hover:shadow-md data-[status=maybe]:border-amber-300/70 data-[status=maybe]:border-l-amber-400 data-[status=maybe]:from-amber-50/50 data-[status=not_going]:border-rose-300/70 data-[status=not_going]:border-l-rose-400 data-[status=not_going]:from-rose-50/50 data-[status=sure]:border-emerald-300/70 data-[status=sure]:border-l-emerald-400 data-[status=sure]:from-emerald-50/60"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-foreground">
              {event.title}
            </h3>
            <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              {formatEventSummary(event)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {event.location ?? "Local a confirmar"}
          </p>
          {event.description ? (
            <p className="text-sm text-foreground/80">{event.description}</p>
          ) : null}
        </button>
      }
    />
  )
}
