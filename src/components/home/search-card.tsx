import Link from "next/link"

import { AuthMenu } from "@/components/auth-menu"
import { useSync } from "@/lib/useSync"

type SearchCardProps = {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  onClearSearch: () => void
}

export function SearchCard({
  searchTerm,
  onSearchTermChange,
  onClearSearch,
}: SearchCardProps) {
  const { syncing } = useSync()

  return (
    <div className="mb-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href="/minha-agenda"
          className="inline-flex min-w-[160px] items-center justify-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground shadow-sm hover:bg-accent/40"
        >
          Minha agenda
        </Link>
        <div className="flex w-full flex-col gap-2 sm:ml-auto sm:flex-row sm:items-center sm:justify-end">
          <div className="relative w-full sm:max-w-sm">
            <input
              type="search"
              placeholder="Buscar bloco"
              value={searchTerm}
              onChange={(event) => onSearchTermChange(event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 pr-16 text-sm"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-accent/40"
              >
                Limpar
              </button>
            ) : null}
          </div>
          <AuthMenu syncing={syncing} />
        </div>
      </div>
    </div>
  )
}
