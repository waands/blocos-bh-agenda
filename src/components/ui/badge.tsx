"use client"

type BadgeProps = {
  className?: string
  children: React.ReactNode
}

export function Badge({ className = "", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground ${className}`}
    >
      {children}
    </span>
  )
}
