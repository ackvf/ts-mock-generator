"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme, type UseThemeProps } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeButton() {
  const t = useRef<UseThemeProps>(null)
  t.current = useTheme()

  const changeTheme = useCallback(() => {
    const { theme, systemTheme, setTheme } = t.current!
    const otherTheme = { "dark": "light", "light": "dark" }[systemTheme!] ?? "system"
    const newTheme = theme === "system" ? otherTheme : "system"
    setTheme(newTheme)
  }, [])

  const [isLight, changeButtonsAfterThemeChange] = useState<boolean>()

  /* To prevent hydration mismatch, we only render the icons on the client (after the useEffect). */
  const ready = isLight !== undefined

  useEffect(() => {
    /* To enable nice icon transition after suppressed theme change. */
    setTimeout(changeButtonsAfterThemeChange, 20, t.current!.resolvedTheme === "light")
  }, [t.current?.resolvedTheme])

  return (
    <Button variant="ghost-neutral" size="icon" onClick={changeTheme} >
      {ready && <Sun className={`transition-all ${isLight ? "scale-100 rotate-0" : "scale-0 -rotate-90"}`} />}
      {ready && <Moon className={`transition-all ${isLight ? "scale-0 rotate-90" : "scale-100 rotate-0"} absolute`} />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
