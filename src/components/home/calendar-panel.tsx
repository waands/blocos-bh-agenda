import type { Localizer, View } from "react-big-calendar"
import { Calendar as BigCalendar } from "react-big-calendar"
import { isSameDay, startOfDay } from "date-fns"

import type { BaseEvent } from "@/lib/eventTypes"

type CalendarEvent = {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  resource: BaseEvent
}

type EventColor = {
  background: string
  border: string
  text: string
}

type CalendarPanelProps = {
  isLoading: boolean
  calendarTitle: string
  calendarDate: Date
  calendarView: View
  calendarEvents: CalendarEvent[]
  localizer: Localizer
  selectedDay: Date
  hoveredEventId: string | null
  onToday: () => void
  onPrev: () => void
  onNext: () => void
  onCalendarDateChange: (date: Date) => void
  onCalendarViewChange: (view: View) => void
  onRangeChange: (range: { start: Date; end: Date } | Date[]) => void
  onSelectDay: (date: Date) => void
  onSelectEvent: (event: BaseEvent, start: Date) => void
  onHoverEvent: (id: string | null) => void
  getEventColor: (event: BaseEvent) => EventColor
  getStatus: (id: string) => string | null
}

export function CalendarPanel({
  isLoading,
  calendarTitle,
  calendarDate,
  calendarView,
  calendarEvents,
  localizer,
  selectedDay,
  hoveredEventId,
  onToday,
  onPrev,
  onNext,
  onCalendarDateChange,
  onCalendarViewChange,
  onRangeChange,
  onSelectDay,
  onSelectEvent,
  onHoverEvent,
  getEventColor,
  getStatus,
}: CalendarPanelProps) {
  return (
    <div className="relative min-h-[calc(100vh-200px)] rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:hidden">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">
            {calendarTitle}
          </p>
          <button
            type="button"
            className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
            onClick={onToday}
          >
            Hoje
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
              onClick={onPrev}
            >
              Voltar
            </button>
            <button
              type="button"
              className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground"
              onClick={onNext}
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
              onClick={() => onCalendarViewChange("month")}
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
              onClick={() => onCalendarViewChange("week")}
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
              onClick={() => onCalendarViewChange("day")}
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
          onNavigate={(date) => onCalendarDateChange(date)}
          onView={(nextView) => onCalendarViewChange(nextView)}
          onRangeChange={onRangeChange}
          selectable
          onSelectSlot={(slotInfo) => {
            onSelectDay(startOfDay(slotInfo.start))
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
              status === "not_going"
                ? {
                    borderStyle: "solid",
                    borderWidth: "2px",
                    borderColor: "#f43f5e",
                    boxShadow: "0 0 0 2px #f43f5e33",
                  }
                : status === "maybe"
                ? {
                    borderStyle: "dashed",
                    borderWidth: "2px",
                  }
                : status === "sure"
                ? {
                    borderStyle: "solid",
                    borderWidth: "2px",
                    boxShadow: `0 0 0 2px ${accent}, 0 0 12px ${accent}55`,
                  }
                : {}
            const baseBorderWidth = isHovered ? "2px" : "1.5px"

            return {
              style: {
                backgroundColor: color.background,
                borderColor: color.border,
                color: color.text,
                fontSize: "0.85rem",
                lineHeight: "1.2rem",
                borderStyle: "solid",
                borderWidth: baseBorderWidth,
                boxShadow: isHovered
                  ? `0 12px 24px -18px ${accent}, 0 0 0 2px ${accent}`
                  : outlineStyles.boxShadow,
                borderColor: isHovered ? accent : color.border,
                transform: isHovered ? "scale(1.03)" : undefined,
                zIndex: isHovered ? 5 : undefined,
                ...outlineStyles,
              },
            }
          }}
          onSelectEvent={(event) => {
            onHoverEvent(event.resource.id)
            onSelectEvent(event.resource, event.start)
          }}
          onSelectSlot={(slotInfo) => {
            onSelectDay(startOfDay(slotInfo.start))
          }}
          style={{ height: "calc(100vh - 220px)" }}
        />
      </div>
    </div>
  )
}
