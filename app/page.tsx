'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CodeDisplay } from '@/components/code-display'
import { parseTypeScriptInterface, validateTypeScript } from '@/lib/parser'
import { generateMockData } from '@/lib/generator'
import { generateInterfaceFromJSON } from '@/lib/json-to-interface'

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

type InputMode = 'interface' | 'json'

export default function Page() {
  const [inputMode, setInputMode] = useState<InputMode>('interface')
  const [interfaceCode, setInterfaceCode] = useState(DEFAULT_INTERFACE)
  const [jsonInput, setJsonInput] = useState('')
  const [generatedInterface, setGeneratedInterface] = useState('')
  const [editableInterface, setEditableInterface] = useState('')
  const [count, setCount] = useState(3)
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isJsonExpanded, setIsJsonExpanded] = useState(false)
  const [isInterfaceExpanded, setIsInterfaceExpanded] = useState(false)

  const handleGenerateInterface = () => {
    setError('')
    setGeneratedInterface('')
    setEditableInterface('')
    setOutput('')

    try {
      if (!jsonInput.trim()) {
        setError('Please provide JSON data')
        return
      }

      const interfaceCode = generateInterfaceFromJSON(jsonInput, 'GeneratedData')
      setGeneratedInterface(interfaceCode)
      setEditableInterface(interfaceCode)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate interface')
    }
  }

  const handleUseInterface = () => {
    setInterfaceCode(editableInterface)
    setInputMode('interface')
    setGeneratedInterface('')
    setEditableInterface('')
    setJsonInput('')
  }

  const handleGenerate = async () => {
    setError('')
    setOutput('')
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

      // Generate mock data
      const mockData = generateMockData(interfaces, { count })

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

        <div className="grid gap-6 lg:grid-cols-2 flex-1 min-h-0">
          {/* Input Section */}
          <div className="flex flex-col gap-6 min-h-0 overflow-y-auto">
            {/* Input Mode Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Input Type</CardTitle>
                <CardDescription>
                  Choose how to define your data structure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant={inputMode === 'interface' ? 'default' : 'outline'}
                    onClick={() => setInputMode('interface')}
                    className="flex-1"
                  >
                    TypeScript Interface
                  </Button>
                  <Button
                    variant={inputMode === 'json' ? 'default' : 'outline'}
                    onClick={() => setInputMode('json')}
                    className="flex-1"
                  >
                    Example JSON
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Conditional Input */}
            {inputMode === 'interface' ? (
              <Card className="flex flex-col flex-1 min-h-0">
                <CardHeader className="flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>TypeScript Interface</CardTitle>
                      <CardDescription>
                        Paste your TypeScript interface definition
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => setIsInterfaceExpanded(true)}
                      variant="ghost"
                      size="sm"
                    >
                      Expand
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 overflow-hidden">
                  <Textarea
                    value={interfaceCode}
                    onChange={(e) => setInterfaceCode(e.target.value)}
                    className="font-mono text-sm h-full resize-none"
                    placeholder="interface MyType { ... }"
                  />
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="flex flex-col flex-1 min-h-0">
                  <CardHeader className="flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Example JSON</CardTitle>
                        <CardDescription>
                          Paste example JSON data to auto-generate interface
                        </CardDescription>
                      </div>
                      <Button
                        onClick={() => setIsJsonExpanded(true)}
                        variant="ghost"
                        size="sm"
                      >
                        Expand
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-3 min-h-0">
                    <Textarea
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      className="font-mono text-sm flex-1 resize-none"
                      placeholder='[{ "name": "John", "age": 30 }]'
                    />
                    <div className="flex-shrink-0 space-y-3">
                      <Button
                        onClick={handleGenerateInterface}
                        variant="outline"
                        className="w-full"
                      >
                        Generate Interface
                      </Button>
                      {generatedInterface && (
                        <p className="text-sm text-green-400">
                          ✓ Interface generated! Review and edit it in the right panel.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Full-screen Editor Modal */}
            <Dialog open={isJsonExpanded} onOpenChange={setIsJsonExpanded}>
              <DialogContent
                className="sm:max-w-[90vw] w-[90vw] max-h-[90vh] h-[90vh] flex flex-col"
                closeButtonClassName="top-0 right-0"
              >
                <Textarea
                  value={jsonInput}
                  onChange={(e) => setJsonInput(e.target.value)}
                  className="font-mono text-sm h-full w-full resize-none border-none! ring-0!"
                  placeholder='[{ "name": "John", "age": 30 }]'
                />
              </DialogContent>
            </Dialog>

            {/* Full-screen TypeScript Interface Editor Modal */}
            <Dialog open={isInterfaceExpanded} onOpenChange={setIsInterfaceExpanded}>
              <DialogContent
                className="sm:max-w-[90vw] w-[90vw] max-h-[90vh] h-[90vh] flex flex-col"
                closeButtonClassName="top-0 right-0"
              >
                <Textarea
                  value={interfaceCode}
                  onChange={(e) => setInterfaceCode(e.target.value)}
                  className="font-mono text-sm h-full w-full resize-none border-none! ring-0!"
                  placeholder='[{ "name": "John", "age": 30 }]'
                />
              </DialogContent>
            </Dialog>

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
                {inputMode === 'json' ? (
                  <>
                    <div className="flex items-center justify-between">
                      <CardTitle>TypeScript Interface Preview</CardTitle>
                      <Button
                        onClick={handleUseInterface}
                        size="sm"
                        disabled={!editableInterface.trim()}
                      >
                        Use This Interface to Generate Mock Data
                      </Button>
                    </div>
                    <CardDescription>
                      {generatedInterface
                        ? 'Review and edit the generated interface, then click above to proceed'
                        : 'Generate an interface from your JSON to preview it here'
                      }
                    </CardDescription>
                  </>
                ) : (
                  <>
                    <CardTitle>Generated Mock Data</CardTitle>
                    <CardDescription>
                      Copy and use in your tests or prototypes
                    </CardDescription>
                  </>
                )}
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
                  {inputMode === 'json' ? (
                    <Textarea
                      value={editableInterface}
                      onChange={(e) => setEditableInterface(e.target.value)}
                      className="font-mono text-sm h-full resize-none"
                      placeholder="Generate an interface from JSON to see it here..."
                    />
                  ) : output ? (
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
