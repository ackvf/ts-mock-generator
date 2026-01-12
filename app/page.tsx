'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CodeDisplay } from '@/components/code-display'
import { parseTypeScriptInterface, validateTypeScript } from '@/lib/parser'
import { generateMockData } from '@/lib/generator'
import { analyzeExampleData, inferConstraintsFromExamples } from '@/lib/analyzer'
import type { AIEnhancement } from '@/lib/types'

const DEFAULT_INTERFACE = `interface User {
  id: string
  name: string
  email: string
  age: number
  isActive: boolean
  role: 'admin' | 'user' | 'guest'
  address: {
    street: string
    city: string
    country: string
  }
  tags: string[]
}`

export default function Page() {
  const [interfaceCode, setInterfaceCode] = useState(DEFAULT_INTERFACE)
  const [exampleData, setExampleData] = useState('')
  const [count, setCount] = useState(3)
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [insights, setInsights] = useState('')
  const [useAI, setUseAI] = useState(false)
  const [aiApiKey, setAiApiKey] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    setError('')
    setOutput('')
    setInsights('')
    setIsGenerating(true)

    try {
      // Validate TypeScript
      const validation = validateTypeScript(interfaceCode)
      if (!validation.valid) {
        setError('TypeScript parsing errors:\n' + validation.errors.join('\n'))
        setIsGenerating(false)
        return
      }

      // Parse interfaces
      const interfaces = parseTypeScriptInterface(interfaceCode)
      if (interfaces.length === 0) {
        setError('No interfaces found. Please define at least one interface.')
        setIsGenerating(false)
        return
      }

      // Analyze example data if provided
      let exampleArray: any[] | undefined
      let constraints: Map<string, AIEnhancement['suggestions']> | undefined

      if (exampleData.trim()) {
        const analysis = analyzeExampleData(exampleData)
        if (!analysis.valid) {
          setError('Example data error: ' + analysis.error)
          setIsGenerating(false)
          return
        }
        exampleArray = analysis.data
        setInsights(analysis.insights || '')

        // Infer constraints from examples
        if (exampleArray) {
          constraints = inferConstraintsFromExamples(exampleArray)
        }
      }

      // Get AI enhancements if enabled
      let aiEnhancements: AIEnhancement[] | undefined
      if (useAI && aiApiKey.trim()) {
        try {
          const response = await fetch('/api/enhance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              interface: interfaceCode,
              apiKey: aiApiKey
            })
          })

          if (response.ok) {
            const data = await response.json()
            aiEnhancements = data.enhancements
          }
        } catch (err) {
          console.error('AI enhancement failed:', err)
          // Continue without AI enhancements
        }
      }

      // Generate mock data
      const mockData = generateMockData(
        interfaces,
        {
          count,
          useExamples: !!exampleArray,
          exampleData: exampleArray
        },
        aiEnhancements
      )

      setOutput(JSON.stringify(mockData, null, 2))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8 overflow-hidden">
      <div className="mx-auto max-w-7xl w-full flex flex-col flex-1 min-h-0">
        <div className="mb-6 text-center flex-shrink-0">
          <h1 className="text-4xl font-bold text-white mb-2">
            TypeScript Mock Generator
          </h1>
          <p className="text-gray-400">
            Generate realistic mock data from TypeScript interfaces
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 flex-1 min-h-0 overflow-auto">
          {/* Input Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>TypeScript Interface</CardTitle>
                <CardDescription>
                  Paste your TypeScript interface definition
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={interfaceCode}
                  onChange={(e) => setInterfaceCode(e.target.value)}
                  className="font-mono text-sm min-h-[300px]"
                  placeholder="interface MyType { ... }"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Example Data
                  <Badge variant="outline">Optional</Badge>
                </CardTitle>
                <CardDescription>
                  Provide example JSON to improve mock data realism
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={exampleData}
                  onChange={(e) => setExampleData(e.target.value)}
                  className="font-mono text-sm min-h-[150px]"
                  placeholder='[{ "name": "John", "age": 30 }]'
                />
                {insights && (
                  <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                    <p className="text-xs text-blue-400 font-mono whitespace-pre-wrap">
                      {insights}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Generation Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="count">Number of Records</Label>
                  <Input
                    id="count"
                    type="number"
                    min="1"
                    max="100"
                    value={count}
                    onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useAI"
                      checked={useAI}
                      onChange={(e) => setUseAI(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="useAI" className="flex items-center gap-2">
                      Use OpenAI Enhancement
                      <Badge variant="outline">Optional</Badge>
                    </Label>
                  </div>
                  {useAI && (
                    <Input
                      type="password"
                      placeholder="OpenAI API Key"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                    />
                  )}
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? 'Generating...' : 'Generate Mock Data'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Output Section */}
          <div className="flex flex-col min-h-0">
            <Card className="flex flex-col h-full min-h-0">
              <CardHeader className="flex-shrink-0">
                <CardTitle>Generated Mock Data</CardTitle>
                <CardDescription>
                  Copy and use in your tests or prototypes
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md mb-4">
                    <p className="text-sm text-red-400 font-mono whitespace-pre-wrap">
                      {error}
                    </p>
                  </div>
                )}
                <div className="flex-1 flex flex-col min-h-0">
                  {output ? (
                    <CodeDisplay code={output} language="json" />
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[400px] text-center text-gray-500">
                      <div>
                        <p>Generated mock data will appear here</p>
                        <p className="text-sm mt-2">Click "Generate Mock Data" to start</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
