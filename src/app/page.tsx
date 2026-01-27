"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { DatesSetArg } from "@fullcalendar/core"
import ptBrLocale from "@/lib/fullcalendarLocalePtBr"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import scrollGridPlugin from "@fullcalendar/scrollgrid"
import timeGridPlugin from "@fullcalendar/timegrid"

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

export default function Home() {
  const { view, setView, setAutoView } = useViewStore()
  const calendarRef = useRef<FullCalendar | null>(null)
  const [events, setEvents] = useState<BaseEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<BaseEvent | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | null>(null)
  const initialFetchDone = useRef(false)
  const lastRangeKey = useRef<string | null>(null)
  const { getStatus, setStatus } = useSync()
  const [listStart, setListStart] = useState<string>("")
  const [listEnd, setListEnd] = useState<string>("")
  const [calendarJumpDate, setCalendarJumpDate] = useState<string>("")

  useEffect(() => {
    if (typeof window === "undefined") return
    const isDesktop = window.innerWidth >= 1024
    setAutoView(isDesktop ? "calendar" : "list")
  }, [setAutoView])

  useEffect(() => {
    const fetchEvents = async (range: DateRange) => {
      try {
        setIsLoading(true)
        setErrorMessage(null)

        const { data, error } = await supabaseClient
          .from("events_base")
          .select("id,title,starts_at,ends_at,location,description,all_day")
          .eq("is_active", true)
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

  useEffect(() => {
    if (initialFetchDone.current || dateRange) return

    const now = new Date()
    const day = now.getDay()
    const mondayOffset = (day + 6) % 7
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - mondayOffset)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 7)

    initialFetchDone.current = true
    setDateRange({ start: startOfWeek, end: endOfWeek })
  }, [dateRange])

  const handleDatesSet = (info: DatesSetArg) => {
    const key = `${info.start.toISOString()}-${info.end.toISOString()}`
    if (lastRangeKey.current === key) return
    lastRangeKey.current = key
    setDateRange({ start: info.start, end: info.end })
  }

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

  const colorPalette = [
    "#2563eb",
    "#16a34a",
    "#dc2626",
    "#f97316",
    "#7c3aed",
    "#0ea5e9",
    "#0891b2",
    "#ca8a04",
  ]

  const calendarEvents = timedEvents.map((event) => {
    const startsAt = new Date(event.starts_at)
    const endsAt = event.ends_at
      ? new Date(event.ends_at)
      : new Date(startsAt.getTime() + 180 * 60 * 1000)
    const colorIndex = event.title.length % colorPalette.length

    return {
      id: event.id,
      title: event.title,
      start: startsAt,
      end: endsAt,
      backgroundColor: colorPalette[colorIndex],
      borderColor: colorPalette[colorIndex],
    }
  })

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-none flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Agenda de blocos
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              Blocos BH
            </h1>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            {view === "calendar" ? (
              <div className="flex items-center gap-2 text-sm">
                <label className="text-muted-foreground">Ir para</label>
                <input
                  type="date"
                  value={calendarJumpDate}
                  onChange={(event) => {
                    const value = event.target.value
                    setCalendarJumpDate(value)
                    if (value) {
                      calendarRef.current?.getApi().gotoDate(value)
                    }
                  }}
                  className="h-9 rounded-md border border-border bg-background px-2"
                />
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <label className="text-muted-foreground">Período</label>
                <input
                  type="date"
                  value={listStart}
                  onChange={(event) => setListStart(event.target.value)}
                  className="h-9 rounded-md border border-border bg-background px-2"
                />
                <span className="text-muted-foreground">até</span>
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
            )}
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(value) => {
                if (value) setView(value as ViewMode)
              }}
              className="rounded-full border border-border bg-background p-1"
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
        ) : view === "list" ? (
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
        ) : (
          <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_240px]">
            <aside className="hidden rounded-2xl border border-border bg-background p-4 text-sm lg:block">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Navegação
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent/40"
                      onClick={() => calendarRef.current?.getApi().today()}
                    >
                      Hoje
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent/40"
                        onClick={() => calendarRef.current?.getApi().prev()}
                      >
                        Voltar
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent/40"
                        onClick={() => calendarRef.current?.getApi().next()}
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
                      onClick={() =>
                        calendarRef.current?.getApi().changeView("dayGridMonth")
                      }
                    >
                      Mês
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent/40"
                      onClick={() =>
                        calendarRef.current?.getApi().changeView("timeGridWeek")
                      }
                    >
                      Semana
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-border bg-background px-3 py-2 text-left text-sm hover:bg-accent/40"
                      onClick={() =>
                        calendarRef.current?.getApi().changeView("timeGridDay")
                      }
                    >
                      Dia
                    </button>
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">
                    Período atual
                  </p>
                  <p className="mt-1">{rangeLabel}</p>
                </div>
              </div>
            </aside>
            <div className="rounded-2xl border border-border bg-background p-4 shadow-sm min-h-[calc(100vh-200px)]">
              {isLoading ? (
                <p className="mb-3 text-xs text-muted-foreground">
                  Atualizando eventos...
                </p>
              ) : null}
              <FullCalendar
                ref={calendarRef}
                plugins={[
                  dayGridPlugin,
                  timeGridPlugin,
                  interactionPlugin,
                  scrollGridPlugin,
                ]}
                locales={[ptBrLocale]}
                locale="pt-br"
                initialView="timeGridWeek"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                dayMinWidth={180}
                datesSet={handleDatesSet}
                events={calendarEvents}
                height="100%"
                allDaySlot={false}
                slotMinTime="06:00:00"
                slotMaxTime="23:00:00"
                eventClick={(info) => {
                  const found = timedEvents.find(
                    (event) => event.id === info.event.id
                  )
                  if (found) {
                    setSelectedEvent(found)
                    setIsSheetOpen(true)
                  }
                }}
              />
            </div>
            <aside className="hidden rounded-2xl border border-border bg-background p-4 text-sm lg:block">
              <div className="flex flex-col gap-4">
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
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Paleta
                  </p>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {colorPalette.map((color) => (
                      <div
                        key={color}
                        className="h-6 rounded-md border border-border"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    As cores ajudam a diferenciar eventos.
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">
                    Dica rápida
                  </p>
                  <p className="mt-1">
                    Use o campo “Ir para” no topo para pular direto para uma
                    data específica.
                  </p>
                </div>
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
