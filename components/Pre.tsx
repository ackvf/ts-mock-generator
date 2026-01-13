import React, { useRef } from 'react'

import { Button } from '@/components/ui/button'

interface CodeExampleProps {
  children: React.ReactNode
  onTrigger: (code: string) => void
}

export function Pre({ children, onTrigger }: CodeExampleProps) {
  const preRef = useRef<HTMLPreElement>(null)
  return (
    <div className="relative bg-muted p-2 rounded text-xs font-mono group">
      {onTrigger && <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs h-6 px-2"
        onClick={() => onTrigger(preRef.current?.innerText || '')}
      >
        Try it
      </Button>}
      <pre ref={preRef}>{children}</pre>
    </div>
  )
}
