import type { BaseEvent } from "@/lib/eventTypes"

import { EventRow } from "@/components/event-row"

type ListPanelProps = {
  isLoading: boolean
  listTimedEvents: BaseEvent[]
  listUndeterminedEvents: BaseEvent[]
  getStatus: (id: string) => string | null
  onStatusChange: (id: string, status: string | null) => void
}

export function ListPanel({
  isLoading,
  listTimedEvents,
  listUndeterminedEvents,
  getStatus,
  onStatusChange,
}: ListPanelProps) {
  return (
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
            onStatusChange={(status) => onStatusChange(event.id, status)}
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
              onStatusChange={(status) => onStatusChange(event.id, status)}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum evento sem horário definido.
          </p>
        )}
      </div>
    </div>
  )
}
