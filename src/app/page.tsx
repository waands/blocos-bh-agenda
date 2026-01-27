"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  addDays,
  addMonths,
  addWeeks,
  format,
  getDay,
  isSameDay,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  endOfMonth,
  endOfWeek,
} from "date-fns"
import { ptBR } from "date-fns/locale"
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
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const hasAutoNavigated = useRef(false)

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
    if (view !== "calendar") return
    if (hasAutoNavigated.current) return
    if (events.length === 0) return

    const sorted = [...events].sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    )
    const first = sorted[0]
    if (first) {
      const targetDate = new Date(first.starts_at)
      setCalendarDate(targetDate)
      setCalendarView("month")
      setCalendarJumpDate(targetDate.toISOString().slice(0, 10))
      hasAutoNavigated.current = true
    }
  }, [events, view])

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

    if (dateRange) {
      void fetchEvents(dateRange)
    }
  }, [dateRange])

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

  const timedEvents = useMemo(
    () => events.filter((event) => !event.all_day),
    [events]
  )
  const undeterminedEvents = useMemo(
    () => events.filter((event) => event.all_day),
    [events]
  )

  const listFilteredEvents = useMemo(() => {
    if (!listStart && !listEnd) return events

    const startDate = listStart ? new Date(`${listStart}T00:00:00-03:00`) : null
    const endDate = listEnd ? new Date(`${listEnd}T23:59:59-03:00`) : null

    return events.filter((event) => {
      const eventDate = new Date(event.starts_at)
      if (startDate && eventDate < startDate) return false
      if (endDate && eventDate > endDate) return false
      return true
    })
  }, [events, listEnd, listStart])

  const listTimedEvents = useMemo(
    () => listFilteredEvents.filter((event) => !event.all_day),
    [listFilteredEvents]
  )
  const listUndeterminedEvents = useMemo(
    () => listFilteredEvents.filter((event) => event.all_day),
    [listFilteredEvents]
  )
  const personalEvents = useMemo(() => {
    return events.filter((event) => {
      const status = getStatus(event.id)
      return status === "maybe" || status === "going" || status === "sure"
    })
  }, [events, getStatus])

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

  const statusColors = {
    maybe: {
      background: "#fef3c7",
      border: "#f59e0b",
      text: "#92400e",
    },
    going: {
      background: "#dbeafe",
      border: "#3b82f6",
      text: "#1e3a8a",
    },
    sure: {
      background: "#dcfce7",
      border: "#22c55e",
      text: "#14532d",
    },
    default: {
      background: "#e2e8f0",
      border: "#94a3b8",
      text: "#334155",
    },
  }

  const getEventColor = (event: BaseEvent) => {
    const status = getStatus(event.id)
    if (status === "maybe") return statusColors.maybe
    if (status === "going") return statusColors.going
    if (status === "sure") return statusColors.sure
    return statusColors.default
  }

  const selectedDayEvents = useMemo(() => {
    const filtered = events.filter((event) =>
      isSameDay(new Date(event.starts_at), selectedDay)
    )
    return filtered.sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    )
  }, [events, selectedDay])

  const selectedDayLabel = useMemo(
    () => format(selectedDay, "d 'de' MMMM", { locale: ptBR }),
    [selectedDay]
  )

  const calendarEvents: CalendarEvent[] = events.map((event) => {
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
      </header>

      <main className="mx-auto w-full max-w-none px-4 py-6">
        <section className="mb-6 rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Sua agenda pessoal
              </p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">
                Veja o que você quer curtir e combine com seus amigos
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Marque blocos como talvez, vou ou certeza e compare com a
                agenda da sua galera para decidir onde encontrar todo mundo.
                Quem estiver logado pode gerar uma página pública para
                compartilhar.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground shadow-sm hover:bg-accent/40"
                onClick={() => setView("calendar")}
              >
                Abrir calendário
              </button>
              <button
                type="button"
                className="rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground shadow-sm hover:bg-accent/40"
                onClick={() => setView("list")}
              >
                Ir para lista
              </button>
            </div>
          </div>
          <div className="mt-6 border-t border-border/60 pt-4">
            {personalEvents.length > 0 ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Seus blocos selecionados
                </p>
                <div className="divide-y divide-border/60">
                  {personalEvents.slice(0, 6).map((event) => (
                    <div
                      key={event.id}
                      className="flex flex-col gap-1 py-3 text-sm"
                    >
                      <span className="font-medium text-foreground">
                        {event.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {event.location ?? "Local a confirmar"}
                      </span>
                    </div>
                  ))}
                </div>
                {personalEvents.length > 6 ? (
                  <p className="text-xs text-muted-foreground">
                    Mostrando 6 de {personalEvents.length} blocos salvos.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p>Nenhum bloco salvo ainda.</p>
                <p>
                  Use o calendário ou a lista para marcar o que você quer ver
                  primeiro.
                </p>
              </div>
            )}
          </div>
        </section>
        {errorMessage ? (
          <div className="rounded-2xl border border-destructive/40 bg-background p-6 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
            <aside className="hidden rounded-2xl border border-border/70 bg-card p-4 text-sm shadow-sm lg:block">
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
                      return {
                        style: {
                          backgroundColor: color,
                          borderColor: color,
                          color: "#fff",
                          fontSize: "0.85rem",
                          lineHeight: "1.2rem",
                        },
                      }
                    }}
                    onSelectEvent={(event) => {
                      const found = event.resource
                      if (found) {
                        setSelectedEvent(found)
                        setIsSheetOpen(true)
                        setSelectedDay(startOfDay(event.start))
                      }
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
            <aside className="hidden rounded-2xl border border-border/70 bg-card p-4 text-sm shadow-sm lg:block">
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
                    <div className="space-y-2">
                      {selectedDayEvents.length > 0 ? (
                        selectedDayEvents.map((event) => {
                          const color = getEventColor(event)
                          const startLabel = event.all_day
                            ? "Horário a divulgar"
                            : new Intl.DateTimeFormat("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              }).format(new Date(event.starts_at))
                          return (
                            <EventDetailsSheet
                              key={event.id}
                              event={event}
                              trigger={
                                <button
                                  type="button"
                                  className="flex w-full items-start gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-left text-xs hover:border-primary/40 hover:bg-accent/30"
                                >
                                  <span
                                    className="mt-1 h-2.5 w-2.5 rounded-full border"
                                    style={{
                                      backgroundColor: color.background,
                                      borderColor: color.border,
                                    }}
                                  />
                                  <span className="flex flex-1 flex-col gap-1">
                                    <span className="text-sm font-semibold text-foreground">
                                      {event.title}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {startLabel}
                                      {event.location
                                        ? ` · ${event.location}`
                                        : ""}
                                    </span>
                                  </span>
                                </button>
                              }
                            />
                          )
                        })
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Nenhum evento selecionado para este dia.
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">
                        Status
                      </p>
                      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                        {[
                          { label: "Talvez", color: statusColors.maybe },
                          { label: "Vou", color: statusColors.going },
                          { label: "Certeza", color: statusColors.sure },
                          { label: "Sem status", color: statusColors.default },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="flex items-center gap-2"
                          >
                            <span
                              className="h-3 w-3 rounded-full border"
                              style={{
                                backgroundColor: item.color.background,
                                borderColor: item.color.border,
                              }}
                            />
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>
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
                            {events.length}
                          </span>
                        </p>
                        <p>
                          Com horário:{" "}
                          <span className="font-semibold text-foreground">
                            {timedEvents.length}
                          </span>
                        </p>
                        <p>
                          A divulgar:{" "}
                          <span className="font-semibold text-foreground">
                            {undeterminedEvents.length}
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
