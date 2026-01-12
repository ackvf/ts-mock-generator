'use client'

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Button } from './ui/button'
import { useState } from 'react'

interface CodeDisplayProps {
  code: string
  language?: 'typescript' | 'json'
}

export function CodeDisplay({ code, language = 'json' }: CodeDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="relative h-full flex flex-col min-h-0">
      <div className="absolute right-2 top-2 z-10">
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopy}
          className="text-xs"
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            minHeight: '100%'
          }}
          showLineNumbers
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}
