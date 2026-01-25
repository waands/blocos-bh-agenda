"use client"

import { EventDetailsSheet } from "@/components/event-details-sheet"
import type { BaseEvent } from "@/lib/eventTypes"

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
}

export function EventRow({ event }: EventRowProps) {
  return (
    <EventDetailsSheet
      event={event}
      trigger={
        <button
          type="button"
          className="flex w-full flex-col gap-2 rounded-xl border border-border bg-background px-4 py-3 text-left transition hover:border-primary/40 hover:bg-accent/30"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-foreground">
              {event.title}
            </h3>
            <span className="text-xs font-medium text-muted-foreground">
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
