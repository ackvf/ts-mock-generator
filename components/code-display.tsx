'use client'

import React, { useLayoutEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx'
import { vs, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

import { Button } from './ui/button'

SyntaxHighlighter.registerLanguage('typescript', tsx)
SyntaxHighlighter.registerLanguage('json', json)

interface CodeDisplayProps {
  code: string
  language?: 'typescript' | 'json'
  showLineNumbers?: boolean
}

export const CodeDisplay = React.memo(function CodeDisplay({ code, language = 'json', showLineNumbers = false }: CodeDisplayProps) {
  const ref = useRef<SyntaxHighlighter & HTMLElement>(null)
  const [copied, setCopied] = useState(false)
  const { resolvedTheme } = useTheme()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  useLayoutEffect(() => {
    if (ref.current?.children[0]) {
      (ref.current.children[0] as HTMLElement).style.lineHeight = '1.1'
    }
  }, [resolvedTheme])

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
          ref={ref}
          id="SyntaxHighlighter"
          language={language}
          style={resolvedTheme === 'dark' ? vscDarkPlus : vs}
          customStyle={{
            margin: 0,
            fontSize: '0.875rem',
            minHeight: '100%',
            lineHeight: '1.1'
          }}
          className="grayscale-50"
          showLineNumbers={showLineNumbers}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
})
