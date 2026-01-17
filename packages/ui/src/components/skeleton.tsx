import { cn } from "@repo/ui/lib/utils"

/**
 * Skeleton loading placeholder with shimmer animation.
 *
 * Uses left-to-right gradient animation that mimics reading direction.
 * Automatically respects `prefers-reduced-motion` via CSS.
 *
 * @example
 * // Basic usage
 * <Skeleton className="h-4 w-[200px]" />
 *
 * // Circular skeleton
 * <Skeleton className="h-12 w-12 rounded-full" />
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        // Shimmer overlay with gradient animation
        "before:absolute before:inset-0",
        "before:translate-x-[-100%]",
        "before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-foreground/5 before:to-transparent",
        // Respect reduced motion preference
        "motion-reduce:before:animate-none",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
