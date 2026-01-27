"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import type { BaseEvent } from "@/lib/eventTypes"

const statusOptions = [
  { value: "maybe", label: "Talvez" },
  { value: "going", label: "Vou" },
  { value: "sure", label: "Certeza" },
] as const

type StatusValue = (typeof statusOptions)[number]["value"]

type EventDetailsSheetProps = {
  event: BaseEvent
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function formatDateTime(dateValue: string) {
  const date = new Date(dateValue)
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date)
  const timeLabel = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)

  return `${dateLabel} · ${timeLabel}`
}

export function EventDetailsSheet({
  event,
  trigger,
  open,
  onOpenChange,
}: EventDetailsSheetProps) {
  const [status, setStatus] = useState<StatusValue | null>(null)

  useEffect(() => {
    setStatus(null)
  }, [event.id])

  const scheduleLabel = useMemo(() => {
    if (event.all_day) {
      return "Horário a divulgar"
    }

    const startLabel = formatDateTime(event.starts_at)
    const endValue = event.ends_at
      ? event.ends_at
      : new Date(
          new Date(event.starts_at).getTime() + 300 * 60 * 1000
        ).toISOString()

    return `${startLabel} até ${formatDateTime(endValue)}`
  }, [event])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent side="right" className="gap-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="text-lg font-semibold">{event.title}</SheetTitle>
          <SheetDescription>{scheduleLabel}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 py-6 text-sm">
          <div>
            <p className="text-muted-foreground">Local</p>
            <p className="font-medium text-foreground">
              {event.location ?? "Local a confirmar"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Detalhes</p>
            <p className="text-foreground">
              {event.description ?? "Sem descricao."}
            </p>
          </div>
        </div>
        <div className="border-t border-border px-4 py-4">
          <p className="mb-3 text-sm text-muted-foreground">
            Definir status
          </p>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={status === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatus(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
