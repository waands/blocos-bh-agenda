"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react"

type SheetContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
}

const SheetContext = createContext<SheetContextValue | null>(null)

type SheetProps = {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const resolvedOpen = isControlled ? open : internalOpen

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setInternalOpen(next)
      }
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange]
  )

  const value = useMemo(
    () => ({ open: resolvedOpen, setOpen }),
    [resolvedOpen, setOpen]
  )

  return <SheetContext.Provider value={value}>{children}</SheetContext.Provider>
}

type SheetTriggerProps = {
  asChild?: boolean
  children: React.ReactElement
}

export function SheetTrigger({ children }: SheetTriggerProps) {
  const context = useContext(SheetContext)
  if (!context) return children
  return (
    <span
      onClick={() => context.setOpen(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          context.setOpen(true)
        }
      }}
      role="button"
      tabIndex={0}
      className="inline-flex"
    >
      {children}
    </span>
  )
}

type SheetContentProps = {
  side?: "right" | "left"
  className?: string
  children: React.ReactNode
}

export function SheetContent({
  side = "right",
  className = "",
  children,
}: SheetContentProps) {
  const context = useContext(SheetContext)
  if (!context?.open) return null

  const sideClasses =
    side === "right" ? "right-0 border-l" : "left-0 border-r"

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-foreground/20"
        onClick={() => context.setOpen(false)}
        aria-label="Fechar painel"
      />
      <aside
        className={`absolute top-0 h-full w-full max-w-md border-border bg-card text-foreground shadow-2xl sm:w-[420px] ${sideClasses} ${className}`}
      >
        {children}
      </aside>
    </div>
  )
}

type SheetHeaderProps = {
  className?: string
  children: React.ReactNode
}

export function SheetHeader({ className = "", children }: SheetHeaderProps) {
  return <div className={`px-4 py-4 ${className}`}>{children}</div>
}

export function SheetTitle({ className = "", children }: SheetHeaderProps) {
  return <h2 className={`text-base font-semibold ${className}`}>{children}</h2>
}

export function SheetDescription({
  className = "",
  children,
}: SheetHeaderProps) {
  return <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>
}
