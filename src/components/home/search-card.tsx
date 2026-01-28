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
  return (
    <div className="mb-4 rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Buscar blocos
          </p>
          <div className="relative mt-2">
            <input
              type="search"
              placeholder="Procure pelo nome do bloco"
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
        </div>
      </div>
    </div>
  )
}
