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
import { useSearchParams } from "next/navigation"
import { dateFnsLocalizer, type View } from "react-big-calendar"

import { EventDetailsSheet } from "@/components/event-details-sheet"
import { AuthPanel } from "@/components/auth-panel"
import { CalendarPanel } from "@/components/home/calendar-panel"
import { FiltersSidebar } from "@/components/home/filters-sidebar"
import { ListPanel } from "@/components/home/list-panel"
import { RightSidebar } from "@/components/home/right-sidebar"
import { SearchCard } from "@/components/home/search-card"
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
  const { getStatus, setStatus, isAuthenticated, syncing } = useSync()
  const [listStart, setListStart] = useState<string>("")
  const [listEnd, setListEnd] = useState<string>("")
  const [calendarJumpDate, setCalendarJumpDate] = useState<string>("")
  const [calendarView, setCalendarView] = useState<View>("week")
  const [calendarDate, setCalendarDate] = useState<Date>(new Date())
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()))
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<
    "all" | "marked" | "not_going" | "maybe" | "sure" | "none"
  >("all")
  const [timeFilter, setTimeFilter] = useState<
    "all" | "timed" | "undetermined"
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
      "not_going",
      "maybe",
      "sure",
      "none",
    ])
    if (statusParam && allowedStatuses.has(statusParam)) {
      setStatusFilter(
        statusParam as
          | "all"
          | "marked"
          | "not_going"
          | "maybe"
          | "sure"
          | "none"
      )
    }

    const calendarViewParam = searchParams.get("calendarView")
    if (
      calendarViewParam === "month" ||
      calendarViewParam === "week" ||
      calendarViewParam === "day"
    ) {
      setCalendarView(calendarViewParam)
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
          .select(
            "id,title,starts_at,ends_at,location,description,ritmos,tamanho_publico,lgbt,all_day"
          )
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

  const normalizeRange = (
    range: DateRange | Date[] | { start: Date; end: Date }
  ) => {
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
      const status = getStatus(event.id)
      if (statusFilter === "marked") {
        return (
          status === "not_going" || status === "maybe" || status === "sure"
        )
      }
      if (statusFilter === "none") {
        return status === null
      }
      if (statusFilter !== "all") {
        return status === statusFilter
      }

      if (normalizedSearch) {
        const haystack = [
          event.title,
          event.location ?? "",
          event.description ?? "",
          event.ritmos ?? "",
        ].join(" ")
        if (!normalizeText(haystack).includes(normalizedSearch)) {
          return false
        }
      }

      return true
    })
  }, [events, getStatus, searchTerm, statusFilter])

  const timeFilteredEvents = useMemo(() => {
    if (timeFilter === "all") return statusFilteredEvents
    return statusFilteredEvents.filter((event) =>
      timeFilter === "timed" ? !event.all_day : event.all_day
    )
  }, [statusFilteredEvents, timeFilter])

  const listFilteredEvents = useMemo(() => {
    if (!listStart && !listEnd) return timeFilteredEvents

    const startDate = listStart ? new Date(`${listStart}T00:00:00-03:00`) : null
    const endDate = listEnd ? new Date(`${listEnd}T23:59:59-03:00`) : null

    return timeFilteredEvents.filter((event) => {
      const eventDate = new Date(event.starts_at)
      if (startDate && eventDate < startDate) return false
      if (endDate && eventDate > endDate) return false
      return true
    })
  }, [listEnd, listStart, timeFilteredEvents])

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
      return status === "maybe" || status === "sure"
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
    const hueOffsets = [0, 6, -6, 12, -12, 18, -18]
    const lightnessLevels = [42, 52, 62, 70]
    const saturationLevels = [74, 68, 62, 56]

    slotEntries.forEach(([_, slotEvents], slotIndex) => {
      const baseHue = (slotIndex * 137.5 + 24) % 360
      const sortedEvents = [...slotEvents].sort((a, b) => {
        const startDiff =
          new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
        if (startDiff !== 0) return startDiff
        const titleDiff = a.title.localeCompare(b.title)
        if (titleDiff !== 0) return titleDiff
        return a.id.localeCompare(b.id)
      })
      sortedEvents.forEach((event, index) => {
        const hueShift = hueOffsets[index % hueOffsets.length]
        const band = Math.floor(index / hueOffsets.length)
        const lightness = lightnessLevels[band % lightnessLevels.length]
        const saturation = saturationLevels[band % saturationLevels.length]
        const hue = (baseHue + hueShift) % 360
        const borderLightness = Math.max(26, lightness - 18)
        const background = `hsl(${hue.toFixed(1)} ${saturation.toFixed(
          1
        )}% ${lightness.toFixed(1)}%)`
        const border = `hsl(${hue.toFixed(1)} ${Math.min(
          86,
          saturation + 10
        ).toFixed(1)}% ${borderLightness.toFixed(1)}%)`
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
    const filtered = timeFilteredEvents.filter((event) =>
      isSameDay(new Date(event.starts_at), selectedDay)
    )
    return filtered.sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    )
  }, [selectedDay, timeFilteredEvents])

  const calendarEvents: CalendarEvent[] = timeFilteredEvents.map((event) => {
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
      <main className="mx-auto w-full max-w-none px-4 py-4">
        {errorMessage ? (
          <div className="rounded-2xl border border-destructive/40 bg-background p-6 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : (
          <>
            <AuthPanel isAuthenticated={isAuthenticated} syncing={syncing} />
            <SearchCard
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              onClearSearch={() => setSearchTerm("")}
            />
            <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
              <FiltersSidebar
                view={view}
                onViewChange={setView}
                rangeLabel={rangeLabel}
                statusFilter={statusFilter}
                timeFilter={timeFilter}
                calendarJumpDate={calendarJumpDate}
                listStart={listStart}
                listEnd={listEnd}
                onStatusFilterChange={setStatusFilter}
                onTimeFilterChange={setTimeFilter}
                onCalendarJumpDateChange={setCalendarJumpDate}
                onListStartChange={setListStart}
                onListEndChange={setListEnd}
                onClearListDates={() => {
                  setListStart("")
                  setListEnd("")
                }}
                onCalendarDateChange={(value) =>
                  setCalendarDate(new Date(`${value}T00:00:00`))
                }
              />
            {view === "calendar" ? (
              <CalendarPanel
                isLoading={isLoading}
                calendarTitle={calendarTitle}
                calendarDate={calendarDate}
                calendarView={calendarView}
                calendarEvents={calendarEvents}
                localizer={localizer}
                selectedDay={selectedDay}
                hoveredEventId={hoveredEventId}
                onToday={() => setCalendarDate(new Date())}
                onPrev={() => shiftCalendarDate("prev")}
                onNext={() => shiftCalendarDate("next")}
                onCalendarDateChange={setCalendarDate}
                onCalendarViewChange={setCalendarView}
                onRangeChange={(range) => {
                  if (view !== "calendar") return
                  const normalized = normalizeRange(
                    range as DateRange | Date[]
                  )
                  setDateRange(normalized)
                }}
                onSelectDay={(date) => setSelectedDay(startOfDay(date))}
                onSelectEvent={(event, start) => {
                  setSelectedEvent(event)
                  setIsSheetOpen(true)
                  setSelectedDay(startOfDay(start))
                }}
                onHoverEvent={setHoveredEventId}
                getEventColor={getEventColor}
                getStatus={getStatus}
              />
            ) : (
              <ListPanel
                isLoading={isLoading}
                listTimedEvents={listTimedEvents}
                listUndeterminedEvents={listUndeterminedEvents}
                getStatus={getStatus}
                onStatusChange={setStatus}
              />
            )}
            <RightSidebar
              view={view}
              selectedDay={selectedDay}
              selectedDayEvents={selectedDayEvents}
              listFilteredEvents={listFilteredEvents}
              listTimedEvents={listTimedEvents}
              listUndeterminedEvents={listUndeterminedEvents}
              hoveredEventId={hoveredEventId}
              onHoverEvent={setHoveredEventId}
              onJumpToDay={(date) => {
                setView("calendar")
                setCalendarView("day")
                setCalendarDate(date)
              }}
              getEventColor={getEventColor}
              getStatus={getStatus}
              onStatusChange={setStatus}
            />
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
