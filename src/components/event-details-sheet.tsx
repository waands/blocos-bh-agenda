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
  { value: "maybe", label: "Estou pensando" },
  { value: "going", label: "Quero ir" },
  { value: "sure", label: "Certeza" },
  { value: "not_going", label: "Não vou" },
] as const

type StatusValue = (typeof statusOptions)[number]["value"]

type EventDetailsSheetProps = {
  event: BaseEvent
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  status?: StatusValue | null
  onStatusChange?: (status: StatusValue) => void
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
  status: statusProp,
  onStatusChange,
}: EventDetailsSheetProps) {
  const [status, setStatus] = useState<StatusValue | null>(statusProp ?? null)
  const [copyFeedback, setCopyFeedback] = useState<"idle" | "copied" | "error">(
    "idle"
  )

  useEffect(() => {
    setStatus(statusProp ?? null)
  }, [event.id, statusProp])

  useEffect(() => {
    if (copyFeedback === "idle") return
    const timeout = window.setTimeout(() => setCopyFeedback("idle"), 2000)
    return () => window.clearTimeout(timeout)
  }, [copyFeedback])

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

  const locationLabel = event.location?.trim() ?? ""
  const hasLocation = Boolean(locationLabel)
  const mapUrl = hasLocation
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        locationLabel
      )}`
    : ""

  const rhythms = (event.ritmos ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent side="right" className="gap-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="text-lg font-semibold">{event.title}</SheetTitle>
          <SheetDescription>{scheduleLabel}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 py-6 text-sm">
          <div className="space-y-2">
            <p className="text-muted-foreground">Local</p>
            <p className="font-medium text-foreground">
              {hasLocation ? locationLabel : "Local a confirmar"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasLocation}
                onClick={async () => {
                  if (!hasLocation) return
                  try {
                    await navigator.clipboard.writeText(locationLabel)
                    setCopyFeedback("copied")
                  } catch {
                    setCopyFeedback("error")
                  }
                }}
              >
                {copyFeedback === "copied"
                  ? "Endereço copiado"
                  : copyFeedback === "error"
                  ? "Falha ao copiar"
                  : "Copiar endereço"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasLocation}
                onClick={() => {
                  if (!hasLocation) return
                  window.open(mapUrl, "_blank", "noopener,noreferrer")
                }}
              >
                Abrir no mapa
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground">Detalhes</p>
            <p className="text-foreground">
              {event.description ?? "Sem descrição."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Gêneros</p>
              <p className="text-foreground">
                {rhythms.length > 0 ? rhythms.join(", ") : "Não informado"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Tamanho do público</p>
              <p className="text-foreground">
                {event.tamanho_publico?.trim() || "Não informado"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">LGBT</p>
              <p className="text-foreground">
                {event.lgbt?.trim() || "Não informado"}
              </p>
            </div>
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
                onClick={() => {
                  setStatus(option.value)
                  onStatusChange?.(option.value)
                }}
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
