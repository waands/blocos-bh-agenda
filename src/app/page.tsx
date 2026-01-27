"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  getDay,
  isSameDay,
  isWithinInterval,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  endOfMonth,
  endOfWeek,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  type View,
} from "react-big-calendar"

import { EventDetailsSheet } from "@/components/event-details-sheet"
import { EventRow } from "@/components/event-row"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { BaseEvent } from "@/lib/eventTypes"
import { supabaseClient } from "@/lib/supabaseClient"
import { useSync } from "@/lib/useSync"
import { useViewStore, type ViewMode } from "@/lib/viewStore"

type DateRange = {
  start: Date
  end: Date
}

type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  resource: BaseEvent
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { locale: ptBR }),
  getDay,
  locales: { "pt-BR": ptBR },
})

const getCalendarRange = (view: View, date: Date): DateRange => {
  if (view === "month") {
    const start = startOfWeek(startOfMonth(date), { locale: ptBR })
    const end = endOfWeek(endOfMonth(date), { locale: ptBR })
    return { start, end: addDays(end, 1) }
  }
  if (view === "day") {
    const start = startOfDay(date)
    return { start, end: addDays(start, 1) }
  }
  const start = startOfWeek(date, { locale: ptBR })
  const end = endOfWeek(date, { locale: ptBR })
  return { start, end: addDays(end, 1) }
}

export default function Home() {
  const searchParams = useSearchParams()
  const { view, setView, setAutoView } = useViewStore()
  const [events, setEvents] = useState<BaseEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<BaseEvent | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | null>(null)
  const { getStatus, setStatus } = useSync()
  const [listStart, setListStart] = useState<string>("")
  const [listEnd, setListEnd] = useState<string>("")
  const [calendarJumpDate, setCalendarJumpDate] = useState<string>("")
  const [calendarView, setCalendarView] = useState<View>("week")
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()))
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<
    "all" | "marked" | "maybe" | "going" | "sure" | "none"
  >("all")
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)
  const autoJumpInFlight = useRef(false)
  const lastAutoJumpRange = useRef<string | null>(null)

  const normalizeText = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()

  useEffect(() => {
    const viewParam = searchParams.get("view")
    if (viewParam === "calendar" || viewParam === "list") {
      setView(viewParam)
    }

    const statusParam = searchParams.get("status")
    const allowedStatuses = new Set([
      "all",
      "marked",
      "maybe",
      "going",
      "sure",
      "none",
    ])
    if (statusParam && allowedStatuses.has(statusParam)) {
      setStatusFilter(
        statusParam as "all" | "marked" | "maybe" | "going" | "sure" | "none"
      )
    }
  }, [searchParams, setView, setStatusFilter])

  useEffect(() => {
    if (typeof window === "undefined") return
    const isDesktop = window.innerWidth >= 1024
    setAutoView(isDesktop ? "calendar" : "list")
  }, [setAutoView])

  const shiftCalendarDate = (direction: "prev" | "next") => {
    const amount = direction === "prev" ? -1 : 1
    if (calendarView === "month") {
      setCalendarDate(addMonths(calendarDate, amount))
      return
    }
    if (calendarView === "day") {
      setCalendarDate(addDays(calendarDate, amount))
      return
    }
    setCalendarDate(addWeeks(calendarDate, amount))
  }

  const computeCalendarRange = (date: Date, viewMode: View): DateRange => {
    if (viewMode === "month") {
      const start = startOfMonth(date)
      const end = addDays(endOfMonth(date), 1)
      return { start, end }
    }
    if (viewMode === "day") {
      const start = startOfDay(date)
      return { start, end: addDays(start, 1) }
    }
    const start = startOfWeek(date, { locale: ptBR })
    const end = endOfWeek(date, { locale: ptBR })
    return { start, end: addDays(end, 1) }
  }

  useEffect(() => {
    if (view !== "calendar") return
    const range = computeCalendarRange(calendarDate, calendarView)
    setDateRange(range)
  }, [calendarDate, calendarView, view])


  useEffect(() => {
    if (view !== "list") return
    const now = new Date()
    const start =
      listStart !== ""
        ? new Date(`${listStart}T00:00:00-03:00`)
        : new Date(now.getFullYear(), 0, 1)
    const end =
      listEnd !== ""
        ? new Date(`${listEnd}T23:59:59-03:00`)
        : new Date(now.getFullYear() + 1, 0, 1)
    setDateRange({ start, end })
  }, [listEnd, listStart, view])

  useEffect(() => {
    setSelectedDay(startOfDay(calendarDate))
  }, [calendarDate])

  useEffect(() => {
    if (view !== "calendar") return
    setCalendarJumpDate(calendarDate.toISOString().slice(0, 10))
  }, [calendarDate, view])

  useEffect(() => {
    const fetchEvents = async (range: DateRange) => {
      try {
        setIsLoading(true)
        setErrorMessage(null)

        const { data, error } = await supabaseClient
          .from("events_base")
          .select("id,title,starts_at,ends_at,location,description,all_day")
          .or("is_active.is.null,is_active.eq.true")
          .gte("starts_at", range.start.toISOString())
          .lt("starts_at", range.end.toISOString())
          .order("starts_at", { ascending: true })

        if (error) throw error

        setEvents((data ?? []) as BaseEvent[])
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Erro ao carregar")
      } finally {
        setIsLoading(false)
      }
    }

    const now = new Date()
    const defaultYear = calendarDate.getFullYear()
    const start =
      listStart !== ""
        ? new Date(`${listStart}T00:00:00-03:00`)
        : new Date(defaultYear, 0, 1)
    const end =
      listEnd !== ""
        ? new Date(`${listEnd}T23:59:59-03:00`)
        : new Date(defaultYear + 1, 0, 1)

    void fetchEvents({ start, end })
  }, [calendarDate, listEnd, listStart])

  const normalizeRange = (range: DateRange | Date[] | { start: Date; end: Date }) => {
    if (Array.isArray(range)) {
      const start = range[0]
      const end = range[range.length - 1]
      return { start, end: addDays(end, 1) }
    }
    return { start: range.start, end: range.end }
  }

  useEffect(() => {
    if (view !== "calendar") return
    setDateRange(getCalendarRange(calendarView, calendarDate))
  }, [calendarDate, calendarView, view])

  useEffect(() => {
    if (view !== "list") return
    const now = new Date()
    const start =
      listStart !== ""
        ? new Date(`${listStart}T00:00:00-03:00`)
        : new Date(now.getFullYear(), 0, 1)
    const end =
      listEnd !== ""
        ? new Date(`${listEnd}T23:59:59-03:00`)
        : new Date(now.getFullYear() + 1, 0, 1)
    setDateRange({ start, end })
  }, [listEnd, listStart, view])

  const statusFilteredEvents = useMemo(() => {
    const normalizedSearch = normalizeText(searchTerm.trim())

    return events.filter((event) => {
      if (statusFilter !== "all") {
        const status = getStatus(event.id)
        if (statusFilter === "marked") {
          if (status !== "maybe" && status !== "going" && status !== "sure") {
            return false
          }
        } else if (statusFilter === "none") {
          if (status !== null) return false
        } else if (status !== statusFilter) {
          return false
        }
      }

      if (
        normalizedSearch &&
        !normalizeText(event.title).includes(normalizedSearch)
      ) {
        return false
      }

      return true
    })
  }, [events, getStatus, searchTerm, statusFilter])

  const timedEvents = useMemo(
    () => statusFilteredEvents.filter((event) => !event.all_day),
    [statusFilteredEvents]
  )
  const undeterminedEvents = useMemo(
    () => statusFilteredEvents.filter((event) => event.all_day),
    [statusFilteredEvents]
  )

  const listFilteredEvents = useMemo(() => {
    if (!listStart && !listEnd) return statusFilteredEvents

    const startDate = listStart ? new Date(`${listStart}T00:00:00-03:00`) : null
    const endDate = listEnd ? new Date(`${listEnd}T23:59:59-03:00`) : null

    return statusFilteredEvents.filter((event) => {
      const eventDate = new Date(event.starts_at)
      if (startDate && eventDate < startDate) return false
      if (endDate && eventDate > endDate) return false
      return true
    })
  }, [listEnd, listStart, statusFilteredEvents])

  const listTimedEvents = useMemo(
    () => listFilteredEvents.filter((event) => !event.all_day),
    [listFilteredEvents]
  )
  const listUndeterminedEvents = useMemo(
    () => listFilteredEvents.filter((event) => event.all_day),
    [listFilteredEvents]
  )

  const rangeLabel = useMemo(() => {
    if (!dateRange) return "Semana atual"
    const start = dateRange.start
    const end = new Date(dateRange.end.getTime() - 24 * 60 * 60 * 1000)
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
    })
    return `${formatter.format(start)} – ${formatter.format(end)}`
  }, [dateRange])

  const calendarTitle = useMemo(() => {
    if (calendarView === "month") {
      return format(calendarDate, "MMMM yyyy", { locale: ptBR })
    }
    if (calendarView === "day") {
      return format(calendarDate, "d 'de' MMMM", { locale: ptBR })
    }
    if (!dateRange) return "Semana atual"
    const start = dateRange.start
    const end = new Date(dateRange.end.getTime() - 24 * 60 * 60 * 1000)
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
    })
    return `${formatter.format(start)} – ${formatter.format(end)}`
  }, [calendarDate, calendarView, dateRange])

  type EventColor = {
    background: string
    border: string
    text: string
  }

  const defaultEventColor: EventColor = {
    background: "#e2e8f0",
    border: "#94a3b8",
    text: "#1e293b",
  }

  const timeSlotColors = useMemo(() => {
    const slotMap = new Map<string, BaseEvent[]>()

    events.forEach((event) => {
      if (event.all_day) return
      const startsAt = new Date(event.starts_at)
      if (Number.isNaN(startsAt.getTime())) return
      const hours = String(startsAt.getHours()).padStart(2, "0")
      const minutes = String(startsAt.getMinutes()).padStart(2, "0")
      const key = `${hours}:${minutes}`
      const existing = slotMap.get(key)
      if (existing) {
        existing.push(event)
      } else {
        slotMap.set(key, [event])
      }
    })

    const slotEntries = Array.from(slotMap.entries()).sort((a, b) => {
      const [aHours, aMinutes] = a[0].split(":").map(Number)
      const [bHours, bMinutes] = b[0].split(":").map(Number)
      return aHours * 60 + aMinutes - (bHours * 60 + bMinutes)
    })

    const colorMap = new Map<string, EventColor>()
    const minLightness = 44
    const maxLightness = 72

    slotEntries.forEach(([_, slotEvents], slotIndex) => {
      const hue = (slotIndex * 137.5 + 24) % 360
      const sortedEvents = [...slotEvents].sort((a, b) => {
        const startDiff =
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
        if (startDiff !== 0) return startDiff
        const titleDiff = a.title.localeCompare(b.title)
        if (titleDiff !== 0) return titleDiff
        return a.id.localeCompare(b.id)
      })
      const step = (maxLightness - minLightness) / (sortedEvents.length + 1)

      sortedEvents.forEach((event, index) => {
        const lightness = minLightness + step * (index + 1)
        const borderLightness = Math.max(28, lightness - 12)
        const background = `hsl(${hue.toFixed(1)} 70% ${lightness.toFixed(
          1
        )}%)`
        const border = `hsl(${hue.toFixed(1)} 72% ${borderLightness.toFixed(
          1
        )}%)`
        const text = lightness > 60 ? "#0f172a" : "#f8fafc"

        colorMap.set(event.id, { background, border, text })
      })
    })

    return colorMap
  }, [events])

  const getEventColor = (event: BaseEvent) => {
    if (event.all_day) return defaultEventColor
    return timeSlotColors.get(event.id) ?? defaultEventColor
  }

  const selectedDayEvents = useMemo(() => {
    const filtered = statusFilteredEvents.filter((event) =>
      isSameDay(new Date(event.starts_at), selectedDay)
    )
    return filtered.sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    )
  }, [selectedDay, statusFilteredEvents])

  const selectedDayLabel = useMemo(
    () => format(selectedDay, "d 'de' MMMM", { locale: ptBR }),
    [selectedDay]
  )

  const calendarEvents: CalendarEvent[] = statusFilteredEvents.map((event) => {
    const startsAt = new Date(event.starts_at)
    const endsAt = event.ends_at
      ? new Date(event.ends_at)
      : new Date(startsAt.getTime() + 300 * 60 * 1000)

    return {
      id: event.id,
      title: event.title,
      start: startsAt,
      end: endsAt,
      allDay: event.all_day,
      resource: event,
    }
  })

  useEffect(() => {
    if (view !== "calendar") return
    if (!dateRange) return
    if (searchTerm.trim() !== "") return
    if (isLoading) return

    const hasInRange = calendarEvents.some((event) =>
      isWithinInterval(event.start, {
        start: dateRange.start,
        end: dateRange.end,
      })
    )
    if (hasInRange) return

    const rangeKey = `${dateRange.start.toISOString()}-${dateRange.end.toISOString()}`
    if (lastAutoJumpRange.current === rangeKey) return
    if (autoJumpInFlight.current) return

    autoJumpInFlight.current = true
    lastAutoJumpRange.current = rangeKey

    const buildBaseQuery = () =>
      supabaseClient
        .from("events_base")
        .select("starts_at")
        .or("is_active.is.null,is_active.eq.true")

    const jumpToClosestEvent = async () => {
      const { data: nextData, error: nextError } = await buildBaseQuery()
        .gte("starts_at", dateRange.start.toISOString())
        .order("starts_at", { ascending: true })
        .limit(1)

      if (nextError) throw nextError

      const next = nextData?.[0]
      if (next?.starts_at) {
        const targetDate = new Date(next.starts_at)
        setCalendarDate(targetDate)
        setCalendarView("month")
        setCalendarJumpDate(format(targetDate, "yyyy-MM-dd"))
        return
      }

      const { data: prevData, error: prevError } = await buildBaseQuery()
        .lt("starts_at", dateRange.start.toISOString())
        .order("starts_at", { ascending: false })
        .limit(1)

      if (prevError) throw prevError

      const prev = prevData?.[0]
      if (prev?.starts_at) {
        const targetDate = new Date(prev.starts_at)
        setCalendarDate(targetDate)
        setCalendarView("month")
        setCalendarJumpDate(format(targetDate, "yyyy-MM-dd"))
      }
    }

    void jumpToClosestEvent()
      .catch((err) => {
        console.error("Auto-jump failed", err)
      })
      .finally(() => {
        autoJumpInFlight.current = false
      })
  }, [calendarEvents, dateRange, isLoading, searchTerm, view])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/60">
      <header className="border-b border-border/70 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-none flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Agenda de blocos
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              Blocos BH
            </h1>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">
              Organize seus blocos preferidos, compare agendas com amigos e
              acompanhe horários com duração padrão de 5 horas por bloco.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/minha-agenda"
              className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground shadow-sm hover:bg-accent/40"
            >
              Minha agenda
            </Link>
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(value) => {
                if (value) setView(value as ViewMode)
              }}
              className="rounded-full border border-border bg-background/80 p-1 shadow-sm"
            >
              <ToggleGroupItem
                value="calendar"
                className="rounded-full px-4 py-2 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                Calendário
              </ToggleGroupItem>
              <ToggleGroupItem
                value="list"
                className="rounded-full px-4 py-2 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                Lista
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-none px-4 py-6">
        {errorMessage ? (
          <div className="rounded-2xl border border-destructive/40 bg-background p-6 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Buscar blocos
                  </p>
                  <div className="relative mt-2">
                    <input
                      type="search"
                      placeholder="Procure pelo nome do bloco"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 pr-16 text-sm"
                    />
                    {searchTerm ? (
                      <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-accent/40"
                      >
                        Limpar
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
              <aside className="hidden max-h-[calc(100vh-220px)] overflow-y-auto rounded-2xl border border-border/70 bg-card p-4 text-sm shadow-sm lg:block">
                <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Navegação
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent/40"
                      onClick={() => setCalendarDate(new Date())}
                    >
                      Hoje
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent/40"
                        onClick={() =>
                          view === "calendar"
                            ? shiftCalendarDate("prev")
                            : setListStart((current) => {
                                if (!current) return current
                                const date = new Date(
                                  `${current}T00:00:00-03:00`
                                )
                                date.setDate(date.getDate() - 7)
                                return date.toISOString().slice(0, 10)
                              })
                        }
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent/40"
                        onClick={() =>
                          view === "calendar"
                            ? shiftCalendarDate("next")
                            : setListStart((current) => {
                                if (!current) return current
                                const date = new Date(
                                  `${current}T00:00:00-03:00`
                                )
                                date.setDate(date.getDate() + 7)
                                return date.toISOString().slice(0, 10)
                              })
                        }
                      >
                        Avançar
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Visualização
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent/40"
                      onClick={() => {
                        setView("calendar")
                        setCalendarView("month")
                      }}
                    >
                      Mês
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent/40"
                      onClick={() => {
                        setView("calendar")
                        setCalendarView("week")
                      }}
                    >
                      Semana
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent/40"
                      onClick={() => {
                        setView("calendar")
                        setCalendarView("day")
                      }}
                    >
                      Dia
                    </button>
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">
                    Período atual
                  </p>
                  <p className="mt-1">{rangeLabel}</p>
                </div>
                {view === "calendar" ? (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      Ir para data
                    </p>
                    <input
                      type="date"
                      value={calendarJumpDate}
                      onChange={(event) => {
                        const value = event.target.value
                        setCalendarJumpDate(value)
                        if (value) {
                          setCalendarDate(new Date(`${value}T00:00:00`))
                        }
                      }}
                      className="mt-3 h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                    />
                  </div>
                ) : (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      Filtrar período
                    </p>
                    <div className="mt-3 flex flex-col gap-2 text-sm">
                      <input
                        type="date"
                        value={listStart}
                        onChange={(event) => setListStart(event.target.value)}
                        className="h-9 rounded-md border border-border bg-background px-2"
                      />
                      <input
                        type="date"
                        value={listEnd}
                        onChange={(event) => setListEnd(event.target.value)}
                        className="h-9 rounded-md border border-border bg-background px-2"
                      />
                      <button
                        type="button"
                        className="text-xs text-muted-foreground underline"
                        onClick={() => {
                          setListStart("")
                          setListEnd("")
                        }}
                      >
                        limpar
                      </button>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Filtros
                  </p>
                  <div className="mt-3 space-y-3 text-sm">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        Status
                      </p>
                      <select
                        value={statusFilter}
                        onChange={(event) =>
                          setStatusFilter(
                            event.target.value as
                              | "all"
                              | "marked"
                              | "maybe"
                              | "going"
                              | "sure"
                              | "none"
                          )
                        }
                        className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                      >
                        <option value="all">Todos</option>
                        <option value="marked">Marcados</option>
                        <option value="maybe">Talvez</option>
                        <option value="going">Vou</option>
                        <option value="sure">Certeza</option>
                        <option value="none">Sem status</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        Gênero
                      </p>
                      <select
                        disabled
                        className="h-9 w-full rounded-md border border-border bg-muted/60 px-2 text-sm text-muted-foreground"
                      >
                        <option>Em breve</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        Bairro
                      </p>
                      <select
                        disabled
                        className="h-9 w-full rounded-md border border-border bg-muted/60 px-2 text-sm text-muted-foreground"
                      >
                        <option>Em breve</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
            {view === "calendar" ? (
              <div className="relative min-h-[calc(100vh-200px)] rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 lg:hidden">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      {calendarTitle}
                    </p>
                    <button
                      type="button"
                      className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
                      onClick={() => setCalendarDate(new Date())}
                    >
                      Hoje
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
                        onClick={() => shiftCalendarDate("prev")}
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
                        onClick={() => shiftCalendarDate("next")}
                      >
                        Avançar
                      </button>
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1 text-xs">
                      <button
                        type="button"
                        className={`rounded-full px-2 py-1 ${
                          calendarView === "month"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                        onClick={() => setCalendarView("month")}
                      >
                        Mês
                      </button>
                      <button
                        type="button"
                        className={`rounded-full px-2 py-1 ${
                          calendarView === "week"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                        onClick={() => setCalendarView("week")}
                      >
                        Semana
                      </button>
                      <button
                        type="button"
                        className={`rounded-full px-2 py-1 ${
                          calendarView === "day"
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground"
                        }`}
                        onClick={() => setCalendarView("day")}
                      >
                        Dia
                      </button>
                    </div>
                  </div>
                </div>
                {isLoading ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-background/40 backdrop-blur-sm">
                    <div className="flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
                      <span className="inline-flex size-2 animate-pulse rounded-full bg-primary" />
                      Atualizando
                    </div>
                  </div>
                ) : null}
                <div className={isLoading ? "blur-sm" : ""}>
                  <BigCalendar
                    localizer={localizer}
                    events={calendarEvents}
                    startAccessor="start"
                    endAccessor="end"
                    date={calendarDate}
                    view={calendarView}
                    views={["month", "week", "day"]}
                    onNavigate={(date) => setCalendarDate(date)}
                    onView={(nextView) => setCalendarView(nextView)}
                    onRangeChange={(range) => {
                      if (view !== "calendar") return
                      const normalized = normalizeRange(
                        range as DateRange | Date[]
                      )
                      setDateRange(normalized)
                    }}
                    selectable
                    onSelectSlot={(slotInfo) => {
                      setSelectedDay(startOfDay(slotInfo.start))
                    }}
                    messages={{
                      today: "Hoje",
                      previous: "Anterior",
                      next: "Próximo",
                      month: "Mês",
                      week: "Semana",
                      day: "Dia",
                      agenda: "Agenda",
                      date: "Data",
                      time: "Hora",
                      event: "Evento",
                      noEventsInRange: "Nenhum evento no período.",
                      showMore: (total) => `mais +${total}`,
                    }}
                    dayPropGetter={(date) => {
                      if (isSameDay(date, selectedDay)) {
                        return { className: "is-selected-day" }
                      }
                      return {}
                    }}
                    headerPropGetter={(date) => {
                      if (isSameDay(date, selectedDay)) {
                        return { className: "is-selected-day" }
                      }
                      return {}
                    }}
                    eventPropGetter={(event) => {
                      const color = getEventColor(event.resource)
                      const status = getStatus(event.resource.id)
                      const isHovered = hoveredEventId === event.resource.id
                      const accent = color.border
                      const outlineStyles =
                        status === "maybe"
                          ? {
                              borderStyle: "dashed",
                              borderWidth: "2px",
                            }
                          : status === "going"
                          ? {
                              borderStyle: "solid",
                              borderWidth: "2px",
                            }
                          : status === "sure"
                          ? {
                              borderStyle: "solid",
                              borderWidth: "2px",
                              boxShadow: `0 0 0 2px ${accent}, 0 0 12px ${accent}55`,
                            }
                          : {}
                      return {
                        style: {
                          backgroundColor: color.background,
                          borderColor: color.border,
                          color: color.text,
                          fontSize: "0.85rem",
                          lineHeight: "1.2rem",
                          boxShadow: isHovered
                            ? `0 12px 24px -18px ${accent}, 0 0 0 2px ${accent}`
                            : outlineStyles.boxShadow,
                          borderWidth: isHovered ? "2px" : undefined,
                          borderColor: isHovered ? accent : color.border,
                          transform: isHovered ? "scale(1.03)" : undefined,
                          zIndex: isHovered ? 5 : undefined,
                          ...outlineStyles,
                        },
                      }
                    }}
                    onSelectEvent={(event) => {
                      setHoveredEventId(event.resource.id)
                      const found = event.resource
                      if (found) {
                        setSelectedEvent(found)
                        setIsSheetOpen(true)
                        setSelectedDay(startOfDay(event.start))
                      }
                    }}
                    onSelectSlot={(slotInfo) => {
                      setSelectedDay(startOfDay(slotInfo.start))
                    }}
                    style={{ height: "calc(100vh - 220px)" }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground">
                      Carregando eventos...
                    </p>
                  ) : null}
                  {listTimedEvents.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      status={getStatus(event.id)}
                      onStatusChange={(status) => setStatus(event.id, status)}
                    />
                  ))}
                  {listTimedEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum evento com horário definido nesta semana.
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Horário a divulgar
                  </p>
                  {listUndeterminedEvents.length > 0 ? (
                    listUndeterminedEvents.map((event) => (
                      <EventRow
                        key={event.id}
                        event={event}
                        status={getStatus(event.id)}
                        onStatusChange={(status) => setStatus(event.id, status)}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhum evento sem horário definido.
                    </p>
                  )}
                </div>
              </div>
            )}
            <aside className="hidden max-h-[calc(100vh-220px)] overflow-y-auto rounded-2xl border border-border/70 bg-card p-4 text-sm shadow-sm lg:block">
              <div className="flex flex-col gap-4">
                {view === "calendar" ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">
                          Selecionado
                        </p>
                        <button
                          type="button"
                          className="rounded-full border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-accent/40"
                          onClick={() => {
                            setView("calendar")
                            setCalendarView("day")
                            setCalendarDate(selectedDay)
                          }}
                        >
                          Ver dia
                        </button>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-foreground">
                        {selectedDayLabel}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {selectedDayEvents.length} eventos
                      </p>
                    </div>
                    <div className="space-y-3">
                      {selectedDayEvents.length > 0 ? (
                        selectedDayEvents.reduce<{
                          label: string
                          events: BaseEvent[]
                        }[]>((groups, event) => {
                          const label = event.all_day
                            ? "Horário a divulgar"
                            : new Intl.DateTimeFormat("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              }).format(new Date(event.starts_at))
                          const last = groups[groups.length - 1]
                          if (last && last.label === label) {
                            last.events.push(event)
                          } else {
                            groups.push({ label, events: [event] })
                          }
                          return groups
                        }, []).map((group) => (
                          <div key={group.label} className="grid w-full gap-2">
                            <div className="flex w-full items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                              <span className="h-px flex-1 bg-border/70" />
                              <span>{group.label}</span>
                              <span className="h-px flex-1 bg-border/70" />
                            </div>
                            <div className="grid w-full gap-2">
                              {group.events.map((event) => {
                                const color = getEventColor(event)
                                return (
                                  <EventDetailsSheet
                                    key={event.id}
                                    event={event}
                                    status={getStatus(event.id)}
                                    onStatusChange={(status) =>
                                      setStatus(event.id, status)
                                    }
                                    trigger={
                                  <button
                                    type="button"
                                    className={`grid w-full grid-cols-[10px_1fr] items-start gap-3 rounded-lg border border-border/60 bg-background px-3 py-3 text-left text-xs shadow-sm hover:border-primary/40 hover:bg-accent/30 ${
                                      hoveredEventId === event.id
                                        ? "ring-2 ring-primary/50"
                                        : ""
                                    }`}
                                    onMouseEnter={() =>
                                      setHoveredEventId(event.id)
                                    }
                                    onMouseLeave={() => setHoveredEventId(null)}
                                  >
                                        <span
                                          className="mt-1 h-2.5 w-2.5 rounded-full border"
                                          style={{
                                            backgroundColor: color.background,
                                            borderColor: color.border,
                                          }}
                                        />
                                        <span className="flex min-w-0 flex-col gap-1">
                                          <span className="truncate text-sm font-semibold text-foreground">
                                            {event.title}
                                          </span>
                                          <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                                            {group.label}
                                          </span>
                                          {event.location ? (
                                            <span className="truncate text-xs text-muted-foreground">
                                              {event.location}
                                            </span>
                                          ) : null}
                                        </span>
                                      </button>
                                    }
                                  />
                                )
                              })}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Nenhum evento selecionado para este dia.
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">
                        Cores
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Eventos no mesmo horário recebem tons diferentes do
                        mesmo matiz para facilitar a leitura.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">
                        Resumo
                      </p>
                      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                        <p>
                          Eventos no período:{" "}
                          <span className="font-semibold text-foreground">
                            {listFilteredEvents.length}
                          </span>
                        </p>
                        <p>
                          Com horário:{" "}
                          <span className="font-semibold text-foreground">
                            {listTimedEvents.length}
                          </span>
                        </p>
                        <p>
                          A divulgar:{" "}
                          <span className="font-semibold text-foreground">
                            {listUndeterminedEvents.length}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                      <p className="font-semibold text-foreground">
                        Dica rápida
                      </p>
                      <p className="mt-1">
                        Use o filtro do menu esquerdo para ajustar o período da
                        lista ou pular para uma data específica no calendário.
                      </p>
                    </div>
                  </>
                )}
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      {selectedEvent ? (
        <EventDetailsSheet
          event={selectedEvent}
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
          status={getStatus(selectedEvent.id)}
          onStatusChange={(status) => setStatus(selectedEvent.id, status)}
        />
      ) : null}
    </div>
  )
}
