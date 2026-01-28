"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { BaseEvent } from "@/lib/eventTypes"
import { loadGoingRoleMap, saveGoingRoleMap } from "@/lib/localEventStore"

const statusOptions = [
  { value: "not_going", label: "Não vou" },
  { value: "maybe", label: "Pensando" },
  { value: "sure", label: "Vou sim" },
] as const

type StatusValue = (typeof statusOptions)[number]["value"]

const goingRoleOptions = [
  { value: "foliao", label: "Folião" },
  { value: "tocar", label: "Vou tocar" },
  { value: "apoio", label: "Vou dar apoio" },
] as const

type GoingRole = (typeof goingRoleOptions)[number]["value"]

type EventDetailsSheetProps = {
  event: BaseEvent
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  status?: StatusValue | null
  onStatusChange?: (status: StatusValue | null) => void
}

function formatDateLabel(dateValue: string) {
  const date = new Date(dateValue)
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date)
}

function formatTimeLabel(dateValue: string) {
  const date = new Date(dateValue)
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
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
  const [goingRole, setGoingRole] = useState<GoingRole | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<"idle" | "copied" | "error">(
    "idle"
  )

  useEffect(() => {
    setStatus(statusProp ?? null)
  }, [event.id, statusProp])

  useEffect(() => {
    const roleMap = loadGoingRoleMap<GoingRole>()
    setGoingRole(roleMap[event.id] ?? null)
  }, [event.id])

  useEffect(() => {
    if (copyFeedback === "idle") return
    const timeout = window.setTimeout(() => setCopyFeedback("idle"), 2000)
    return () => window.clearTimeout(timeout)
  }, [copyFeedback])

  const scheduleLabel = useMemo(() => {
    if (event.all_day) {
      return "Horário a divulgar"
    }

    const endValue = event.ends_at
      ? event.ends_at
      : new Date(
          new Date(event.starts_at).getTime() + 300 * 60 * 1000
        ).toISOString()

    return `${formatTimeLabel(event.starts_at)} – ${formatTimeLabel(endValue)}`
  }, [event])

  const dateLabel = useMemo(
    () => formatDateLabel(event.starts_at),
    [event.starts_at]
  )

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

  const handleStatusChange = (nextStatus: StatusValue) => {
    const resolvedStatus = status === nextStatus ? null : nextStatus
    setStatus(resolvedStatus)
    onStatusChange?.(resolvedStatus)
  }

  const handleGoingRoleChange = (nextRole: GoingRole) => {
    const resolvedRole = goingRole === nextRole ? null : nextRole
    const roleMap = loadGoingRoleMap<GoingRole>()

    if (resolvedRole) {
      roleMap[event.id] = resolvedRole
    } else {
      delete roleMap[event.id]
    }

    saveGoingRoleMap(roleMap)
    setGoingRole(resolvedRole)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent side="right" className="flex h-full flex-col">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="text-4xl font-semibold leading-tight sm:text-5xl">
            {event.title}
          </SheetTitle>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              <p className="uppercase tracking-widest text-muted-foreground">
                Data
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {dateLabel}
              </p>
            </div>
            <div>
              <p className="uppercase tracking-widest text-muted-foreground">
                Horário
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {scheduleLabel}
              </p>
            </div>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-6 text-sm">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Local
              </p>
              <div className="flex items-center gap-3">
                <p className="min-w-0 flex-1 text-base font-medium text-foreground">
                  {hasLocation ? locationLabel : "Local a confirmar"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 w-10 p-0"
                  disabled={!hasLocation}
                  aria-label={
                    copyFeedback === "copied"
                      ? "Endereço copiado"
                      : "Copiar endereço"
                  }
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
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5"
                  >
                    <path
                      d="M9 9h9v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2Z"
                    />
                    <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
                  </svg>
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={!hasLocation}
                  onClick={() => {
                    if (!hasLocation) return
                    window.open(mapUrl, "_blank", "noopener,noreferrer")
                  }}
                  className="gap-2"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-4 w-4"
                  >
                    <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                  Abrir no mapa
                </Button>
                {copyFeedback !== "idle" ? (
                  <span className="text-xs text-muted-foreground">
                    {copyFeedback === "copied"
                      ? "Endereço copiado"
                      : "Falha ao copiar"}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Detalhes
              </p>
              <p className="text-foreground">
                {event.description ?? "Sem descrição."}
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Gêneros
                </p>
                {rhythms.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {rhythms.map((rhythm) => (
                      <Badge key={rhythm}>{rhythm}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Não informado
                  </p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Tamanho do público
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {event.tamanho_publico?.trim() || "Não informado"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Obs.
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    {event.lgbt?.trim() || "Não informado"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-border px-4 py-4">
          <p className="mb-3 text-sm text-muted-foreground">
            Definir status
          </p>
          <ToggleGroup
            value={status ?? ""}
            onValueChange={(value) => handleStatusChange(value as StatusValue)}
            className="flex flex-wrap gap-2"
          >
            {statusOptions.map((option) => {
              const activeStyle =
                option.value === "not_going"
                  ? "data-[state=on]:border-rose-500 data-[state=on]:bg-rose-500 data-[state=on]:text-white"
                  : option.value === "maybe"
                  ? "data-[state=on]:border-amber-500 data-[state=on]:bg-amber-500 data-[state=on]:text-white"
                  : "data-[state=on]:border-emerald-500 data-[state=on]:bg-emerald-500 data-[state=on]:text-white"

              return (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  className={`rounded-full border border-border px-4 py-1.5 text-sm font-medium transition ${activeStyle}`}
                >
                  {option.label}
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>
          {status === "sure" ? (
            <div className="mt-4 space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Como você vai participar
              </p>
              <ToggleGroup
                value={goingRole ?? ""}
                onValueChange={(value) =>
                  handleGoingRoleChange(value as GoingRole)
                }
                className="flex flex-wrap gap-2"
              >
                {goingRoleOptions.map((option) => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium transition data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                  >
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p className="text-xs text-muted-foreground">
                Clique de novo para remover a seleção.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Clique de novo no status para deixar sem seleção.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
