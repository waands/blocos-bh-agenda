"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { DatesSetArg } from "@fullcalendar/core"
import FullCalendar from "@fullcalendar/react"
import interactionPlugin from "@fullcalendar/interaction"
import timeGridPlugin from "@fullcalendar/timegrid"

import { EventDetailsSheet } from "@/components/event-details-sheet"
import { EventRow } from "@/components/event-row"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { BaseEvent } from "@/lib/eventTypes"
import { supabaseClient } from "@/lib/supabaseClient"
import { useViewStore, type ViewMode } from "@/lib/viewStore"

type DateRange = {
  start: Date
  end: Date
}

export default function Home() {
  const { view, setView, setAutoView } = useViewStore()
  const [events, setEvents] = useState<BaseEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<BaseEvent | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | null>(null)
  const initialFetchDone = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const isDesktop = window.innerWidth >= 1024
    setAutoView(isDesktop ? "calendar" : "list")
  }, [setAutoView])

  useEffect(() => {
    void import("@fullcalendar/core/index.global.js")
    void import("@fullcalendar/timegrid/index.global.js")
  }, [])

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

  const calendarEvents = timedEvents.map((event) => {
    const startsAt = new Date(event.starts_at)
    const endsAt = event.ends_at
      ? new Date(event.ends_at)
      : new Date(startsAt.getTime() + 180 * 60 * 1000)

    return {
      id: event.id,
      title: event.title,
      start: startsAt,
      end: endsAt,
    }
  })

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Agenda de blocos
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              Blocos BH
            </h1>
          </div>
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
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6">
        {isLoading ? (
          <div className="rounded-2xl border border-border bg-background p-6 text-sm text-muted-foreground">
            Carregando eventos...
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-destructive/40 bg-background p-6 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : view === "list" ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              {timedEvents.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
              {timedEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum evento com horario definido nesta semana.
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Horário a divulgar
              </p>
              {undeterminedEvents.length > 0 ? (
                undeterminedEvents.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum evento sem horario definido.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <FullCalendar
              plugins={[timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "timeGridWeek,timeGridDay",
              }}
              datesSet={handleDatesSet}
              events={calendarEvents}
              height="auto"
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
        )}
      </main>

      {selectedEvent ? (
        <EventDetailsSheet
          event={selectedEvent}
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
        />
      ) : null}
    </div>
  )
}
