"use client"

import { useEffect, useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import timeGridPlugin from "@fullcalendar/timegrid"

import { EventDetailsSheet } from "@/components/event-details-sheet"
import { EventRow } from "@/components/event-row"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { mockEvents, type Event } from "@/lib/mockEvents"
import { useViewStore, type ViewMode } from "@/lib/viewStore"

export default function Home() {
  const { view, setView, setAutoView } = useViewStore()
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const isDesktop = window.innerWidth >= 1024
    setAutoView(isDesktop ? "calendar" : "list")
  }, [setAutoView])

  useEffect(() => {
    void import("@fullcalendar/core/index.global.js")
    void import("@fullcalendar/daygrid/index.global.js")
    void import("@fullcalendar/timegrid/index.global.js")
  }, [])

  const calendarEvents = mockEvents.map((event) => ({
    id: event.id,
    title: event.title,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
  }))

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
        {view === "list" ? (
          <div className="flex flex-col gap-4">
            {mockEvents.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek",
              }}
              events={calendarEvents}
              height="auto"
              eventClick={(info) => {
                const found = mockEvents.find((event) => event.id === info.event.id)
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
