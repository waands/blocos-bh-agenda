import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { ViewMode } from "@/lib/viewStore"

type FiltersSidebarProps = {
  view: ViewMode
  onViewChange: (value: ViewMode) => void
  rangeLabel: string
  statusFilter: "all" | "marked" | "maybe" | "going" | "sure" | "none"
  timeFilter: "all" | "timed" | "undetermined"
  calendarJumpDate: string
  listStart: string
  listEnd: string
  onStatusFilterChange: (
    value: "all" | "marked" | "maybe" | "going" | "sure" | "none"
  ) => void
  onTimeFilterChange: (value: "all" | "timed" | "undetermined") => void
  onCalendarJumpDateChange: (value: string) => void
  onListStartChange: (value: string) => void
  onListEndChange: (value: string) => void
  onClearListDates: () => void
  onCalendarDateChange: (value: string) => void
}

export function FiltersSidebar({
  view,
  onViewChange,
  rangeLabel,
  statusFilter,
  timeFilter,
  calendarJumpDate,
  listStart,
  listEnd,
  onStatusFilterChange,
  onTimeFilterChange,
  onCalendarJumpDateChange,
  onListStartChange,
  onListEndChange,
  onClearListDates,
  onCalendarDateChange,
}: FiltersSidebarProps) {
  return (
    <aside className="hidden max-h-[calc(100vh-220px)] overflow-y-auto rounded-2xl border border-border/70 bg-card p-4 text-sm shadow-sm lg:block">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Visualização
          </p>
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(value) => {
              if (value) onViewChange(value as ViewMode)
            }}
            className="mt-3 w-full rounded-full border border-border bg-background/80 p-1 shadow-sm"
          >
            <ToggleGroupItem
              value="calendar"
              className="flex-1 rounded-full px-4 py-2 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Calendário
            </ToggleGroupItem>
            <ToggleGroupItem
              value="list"
              className="flex-1 rounded-full px-4 py-2 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              Lista
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Em foco
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {rangeLabel}
          </p>
          <p className="mt-1">Ajuste os filtros para deixar só o que importa.</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Filtros principais
          </p>
          <div className="mt-3 space-y-3 text-sm">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                Status
              </p>
              <select
                value={statusFilter}
                onChange={(event) =>
                  onStatusFilterChange(
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
                <option value="maybe">Estou pensando</option>
                <option value="going">Vou</option>
                <option value="sure">Certeza</option>
                <option value="none">Sem status</option>
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                Horário
              </p>
              <select
                value={timeFilter}
                onChange={(event) =>
                  onTimeFilterChange(
                    event.target.value as "all" | "timed" | "undetermined"
                  )
                }
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="all">Todos</option>
                <option value="timed">Com horário</option>
                <option value="undetermined">A divulgar</option>
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
                onCalendarJumpDateChange(value)
                if (value) {
                  onCalendarDateChange(value)
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
                onChange={(event) => onListStartChange(event.target.value)}
                className="h-9 rounded-md border border-border bg-background px-2"
              />
              <input
                type="date"
                value={listEnd}
                onChange={(event) => onListEndChange(event.target.value)}
                className="h-9 rounded-md border border-border bg-background px-2"
              />
              <button
                type="button"
                className="text-xs text-muted-foreground underline"
                onClick={onClearListDates}
              >
                limpar
              </button>
            </div>
          </div>
        )}
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Amigos
          </p>
          <div className="mt-3 space-y-3 text-sm">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                Status
              </p>
              <select
                value={statusFilter}
                onChange={(event) =>
                  onStatusFilterChange(
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
                <option value="maybe">Estou pensando</option>
                <option value="going">Vou</option>
                <option value="sure">Certeza</option>
                <option value="none">Sem status</option>
              </select>
            </div>
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
              Em breve será possível comparar agendas por aqui.
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
