import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { EventDetailsSheet } from "@/components/event-details-sheet"
import type { BaseEvent } from "@/lib/eventTypes"
import type { ViewMode } from "@/lib/viewStore"

type EventColor = {
  background: string
  border: string
  text: string
}

type RightSidebarProps = {
  view: ViewMode
  selectedDay: Date
  selectedDayEvents: BaseEvent[]
  listFilteredEvents: BaseEvent[]
  listTimedEvents: BaseEvent[]
  listUndeterminedEvents: BaseEvent[]
  hoveredEventId: string | null
  onHoverEvent: (id: string | null) => void
  onJumpToDay: (date: Date) => void
  getEventColor: (event: BaseEvent) => EventColor
  getStatus: (id: string) => string | null
  onStatusChange: (id: string, status: string | null) => void
}

export function RightSidebar({
  view,
  selectedDay,
  selectedDayEvents,
  listFilteredEvents,
  listTimedEvents,
  listUndeterminedEvents,
  hoveredEventId,
  onHoverEvent,
  onJumpToDay,
  getEventColor,
  getStatus,
  onStatusChange,
}: RightSidebarProps) {
  const selectedDayLabel = format(selectedDay, "d 'de' MMMM", { locale: ptBR })

  return (
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
                  onClick={() => onJumpToDay(selectedDay)}
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
                selectedDayEvents
                  .reduce<{
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
                  }, [])
                  .map((group) => (
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
                                onStatusChange(event.id, status)
                              }
                              trigger={
                                <button
                                  type="button"
                                  className={`grid w-full grid-cols-[10px_1fr] items-start gap-3 rounded-lg border border-border/60 bg-background px-3 py-3 text-left text-xs shadow-sm hover:border-primary/40 hover:bg-accent/30 ${
                                    hoveredEventId === event.id
                                      ? "ring-2 ring-primary/50"
                                      : ""
                                  }`}
                                  onMouseEnter={() => onHoverEvent(event.id)}
                                  onMouseLeave={() => onHoverEvent(null)}
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
                Eventos no mesmo horário recebem tons diferentes do mesmo matiz
                para facilitar a leitura.
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
              <p className="font-semibold text-foreground">Dica rápida</p>
              <p className="mt-1">
                Use o filtro do menu esquerdo para ajustar o período da lista ou
                pular para uma data específica no calendário.
              </p>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
