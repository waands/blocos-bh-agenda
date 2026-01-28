import Link from "next/link"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { ViewMode } from "@/lib/viewStore"

type HomeHeaderProps = {
  view: ViewMode
  onViewChange: (value: ViewMode) => void
}

export function HomeHeader({ view, onViewChange }: HomeHeaderProps) {
  return (
    <header className="border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-none flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Agenda de blocos
          </p>
          <h1 className="text-2xl font-semibold text-foreground">Blocos BH</h1>
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
              if (value) onViewChange(value as ViewMode)
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
  )
}
