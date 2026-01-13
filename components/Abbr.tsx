import { TooltipContent, TooltipRoot, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * Tooltip shorthand for inline use.
 *
 * @example
 * <Abbr>HTML<span>HyperText Markup Language</span></Abbr>
 *
 * // custom trigger element
 * <Abbr asChild>
 *   <strong>HTML</strong>
 *   <span>HyperText Markup Language</span>
 * </Abbr>
 */
export function Abbr({
  asChild = false,
  children,
  className = ""
}: {
  /**
   * By default, the Abbr component wraps the trigger **text** in an `<abbr>` tag.\
   * To avoid this and use a custom element **as is**, set `asChild` to `true`.
   */
  asChild?: boolean
  children: [trigger: React.ReactNode, tooltip: React.ReactNode]
  className?: string
}) {
  return (
    <TooltipRoot>
      <TooltipTrigger tabIndex={-1}>{asChild ? children[0] : <abbr className={className}>{children[0]}</abbr>}</TooltipTrigger>
      <TooltipContent>{children[1]}</TooltipContent>
    </TooltipRoot>
  )
}
