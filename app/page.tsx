'use client'

import { Fragment, useEffect, useMemo, useReducer, useRef, useState } from 'react'

import { Abbr } from '@/components/Abbr'
import { CodeDisplay } from '@/components/code-display'
import { Pre } from '@/components/Pre'
import { ThemeButton } from '@/components/ThemeButton'
import { Accordion, AccordionContent, AccordionItem, AccordionPrimitive, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { generateMockData } from '@/lib/generator'
import { generateInterfaceFromJSON } from '@/lib/json-to-interface'
import { parseTypeScriptInterface, validateTypeScript } from '@/lib/parser'
import { debounce } from '@/utils/debounce'

type InputMode = 'interface' | 'json'

export default function Page() {
  const [quantity, setQuantity] = useState(1)
  const [isAccordionOpen, toggleAccordion] = useReducer((state, turn?: boolean) => (turn === true && ["show-tips"]) || (turn === false && []) || (state.length ? [] : ["show-tips"]), [] as string[])
  const [inputMode, setInputMode] = useState<InputMode>('interface')
  const [interfaceCode, setInterfaceCode] = useState(DEFAULT_INTERFACE)
  const [jsonInput, setJsonInput] = useState('')
  const [generatedInterface, setGeneratedInterface] = useState('')
  const [seed, setSeed] = useState<number | undefined>(undefined)
  const [recentSeeds, setRecentSeeds] = useState<number[]>([])
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')
  const [hasValidationWarning, setHasValidationWarning] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isJsonExpanded, setIsJsonExpanded] = useState(false)
  const [isInterfaceExpanded, setIsInterfaceExpanded] = useState(false)
  const interfaceTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-generate interface from JSON input in real-time with debouncing
  const debouncedGenerateInterface = useMemo(() => (
    debounce((jsonInput: string, inputMode: InputMode, error: string) => {
      if (!jsonInput.trim()) {
        setGeneratedInterface('')
        return
      }

      try {
        const interfaceCode = generateInterfaceFromJSON(jsonInput)
        setGeneratedInterface(interfaceCode)
        if (error && inputMode === 'json') setError('')
      } catch (err) {
        setGeneratedInterface('')
        if (inputMode === 'json') setError(err instanceof Error ? err.message : 'Invalid JSON')
      }
    }, 500)
  ), [])

  // Auto-generate mock data when interface code changes (with debouncing)
  const debouncedGenerateMockData = useMemo(() => (
    debounce((code: string, inputMode: InputMode) => {
      if (inputMode === 'interface' && code.trim()) {
        handleGenerateMock.current()
      }
    }, 500)
  ), [])

  useEffect(() => {
    debouncedGenerateInterface(jsonInput, inputMode, error)
  }, [jsonInput, inputMode, error]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    debouncedGenerateMockData(interfaceCode, inputMode)
  }, [interfaceCode, inputMode]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    debouncedGenerateInterface.cancel()
    debouncedGenerateMockData.cancel()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUseInterface = () => {
    setInterfaceCode(generatedInterface)
    setInputMode('interface')
    setGeneratedInterface('')
  }

  const highlightErrorInTextarea = (errorMessage: string) => {
    // Parse error message to get line number: "Line 5:10 - message"
    const lineMatch = errorMessage.match(/Line (\d+):(\d+)/)
    if (!lineMatch || !interfaceTextareaRef.current) return

    const lineNumber = parseInt(lineMatch[1], 10)
    const lines = interfaceCode.split('\n')

    if (lineNumber > lines.length) return

    // Calculate start position (sum of all previous lines + newlines)
    let start = 0
    for (let i = 0; i < lineNumber - 1; i++) {
      start += lines[i].length + 1 // +1 for newline
    }

    // Select the entire line
    const end = start + lines[lineNumber - 1].length

    // Focus and select
    interfaceTextareaRef.current.focus()
    interfaceTextareaRef.current.setSelectionRange(start, end)
    interfaceTextareaRef.current.scrollTop = interfaceTextareaRef.current.scrollHeight * ((lineNumber - 1) / lines.length)
  }

  const handleGenerateMock = useRef<(isManual?: boolean) => Promise<void>>(null!)
  handleGenerateMock.current = async (isManual = false) => {
    setError('')
    setOutput('')
    setIsGenerating(true)

    try {
      // Validate TypeScript
      const validation = validateTypeScript(interfaceCode)
      if (!validation.valid) {
        setHasValidationWarning(true)

        // Only show errors if manually triggered
        if (isManual) {
          const errorText = 'TypeScript parsing errors:\n' + validation.errors.join('\n')
          setError(errorText)
          // Highlight the first error
          if (validation.errors.length > 0) {
            setTimeout(() => highlightErrorInTextarea(validation.errors[0]), 100)
          }
        }
        // Continue with generation anyway
      } else {
        setHasValidationWarning(false)
      }

      // Parse interfaces
      const interfaces = parseTypeScriptInterface(interfaceCode)
      if (interfaces.length === 0) {
        setError('No interfaces found. Please define at least one interface.')
        setIsGenerating(false)
        return
      }

      // Generate mock data
      const mockData = generateMockData(interfaces, { quantity, seed })

      // Update recent seeds (keep last 3, don't add duplicates)
      setRecentSeeds(prev => {
        if (prev.includes(mockData.seed)) return prev
        const updated = [mockData.seed, ...prev]
        return updated.slice(0, 3)
      })

      setOutput(JSON.stringify(mockData.result, null, 2))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsGenerating(false)
    }
  }

  const ExploreButton = ({ className = "" }) => (
    <Button
      onClick={() => {
        setQuantity(1)
        toggleAccordion(false)
        setInterfaceCode(CAPABILITIES_EXAMPLE)
        setTimeout(() => handleGenerateMock.current(), 250)
      }}
      variant="outline"
      size="sm"
      className={className}
    >
      🚀 Explore Capabilities
    </Button>
  )

  return (
    <div className="flex flex-col h-screen bg-background p-8 overflow-hidden">
      {/* Top Right Button Section */}

      <div className="mx-auto max-w-7xl w-full flex flex-col flex-1 min-h-0">
        <div className="relative mb-6 text-center flex-shrink-0">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Delightful TS/JSON Mock Generator
          </h1>
          <p className="text-neutral-400">
            Generate mock data from example JSONs or TypeScript interfaces
          </p>
          <div className="absolute top-0 left-0 z-10 flex gap-3 items-center">
            <a className="alogo size-15" href="https://qwerty.xyz/" target="_blank">
              <img src="icon.png" className="size-full logo spin" alt="Qwerty.xyz logo" />
              <img src="icon.png" className="size-full logo chill" alt="Qwerty.xyz logo" />
            </a>
            <a
              href="https://github.com/ackvf/ts-mock-generator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              title="Feedback & Bug Reports"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Feedback</span>
            </a>
          </div>
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <ThemeButton />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 flex-1 min-h-0">
          {/* Input Section */}
          <div className="flex flex-col gap-6 min-h-0">
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
                    <div className="flex gap-2">
                      <ExploreButton />
                      <Button
                        onClick={() => setIsInterfaceExpanded(true)}
                        variant="ghost"
                        size="sm"
                      >
                        Expand
                      </Button>
                    </div>
                  </div>


                  <Accordion value={isAccordionOpen} className="mt-2">
                    <AccordionItem value="show-tips" className="border-none">
                      <AccordionTrigger onClick={toggleAccordion} className="text-xs text-muted-foreground py-2 hover:no-underline">
                        💡 Show Tips: field name awareness, template literals, substitutions...
                      </AccordionTrigger>
                      <AccordionContent className="text-xs text-muted-foreground space-y-2 pb-2">
                        <Accordion>
                          <AccordionItem value="smart-fields" className="border-none">
                            <AccordionTrigger className="text-xs text-muted-foreground py-2 hover:no-underline">
                              💡 Basic: Use recognized field names for better generated values
                            </AccordionTrigger>
                            <AccordionContent className="text-xs text-muted-foreground space-y-2 pb-2">
                              <div>If a field name <Abbr>includes<p>e.g. includes `address` within the field name, such as `homeAddress` or `billing_address`</p></Abbr> these keywords, the generator will create more realistic mock data.</div>
                              <div><strong>Personal:</strong> <samp>name</samp>, <samp>firstname</samp>, <samp>first</samp>, <samp>lastname</samp>, <samp>last</samp>, <samp>email</samp>, <samp>username</samp>, <samp>password</samp>, <samp>phone</samp>, <samp>avatar</samp>, <samp>image</samp></div>
                              <div><strong>Location:</strong> <samp>address</samp>, <samp>street</samp>, <samp>city</samp>, <samp>state</samp>, <samp>province</samp>, <samp>country</samp>, <samp>zipcode</samp>, <samp>zip</samp>, <samp>postal</samp>, <samp>latitude</samp>, <samp>longitude</samp></div>
                              <div><strong>Work:</strong> <samp>company</samp>, <samp>organization</samp>, <samp>org</samp>, <samp>job</samp>, <samp>title</samp>, <samp>position</samp>, <samp>department</samp></div>
                              <div><strong>Web:</strong> <samp>url</samp>, <samp>website</samp>, <samp>uuid</samp>, <samp>id</samp>, <samp>color</samp></div>
                              <div><strong>Commerce:</strong> <samp>price</samp>, <samp>amount</samp>, <samp>cost</samp>, <samp>currency</samp>, <samp>product</samp></div>
                              <div><strong>Numbers:</strong> <samp>age</samp>, <samp>year</samp>, <samp>month</samp>, <samp>day</samp>, <samp>hour</samp>, <samp>minute</samp>, <samp>second</samp>, <samp>quantity</samp>, <samp>count</samp>, <samp>percent</samp>, <samp>rate</samp>, <samp>rating</samp></div>
                              <div><strong>Text:</strong> <samp>description</samp>, <samp>bio</samp>, <samp>text</samp>, <samp>content</samp></div>
                            </AccordionContent>
                          </AccordionItem>
                          <AccordionItem value="template-literals" className="border-none">
                            <AccordionTrigger className="text-xs text-muted-foreground py-2 hover:no-underline">
                              ⚡ Advanced: Template Literal Types
                            </AccordionTrigger>
                            <AccordionContent className="text-xs text-muted-foreground space-y-2 pb-2">
                              <div>
                                Use TypeScript template literal types to generate highly specific string patterns. The generator will randomly select from union types and combine them according to your template.
                              </div>
                              <div className="mt-3">
                                <strong>Example - Product SKUs:</strong>
                              </div>
                              <Pre onTrigger={(code) => { setInterfaceCode(code); setTimeout(() => handleGenerateMock.current()) }}>
                                interface Product {'{'}
                                <br />
                                {"  "}sku: `${'{Digit}'}-${'{Category}'}-${'{number}'}-${'{Size}'}`
                                <br />{'}'}
                                <br /><br />
                                type Category = 'ELEC' | 'FURN' | 'CLTH'
                                <br />
                                type Size = 'SM' | 'MD' | 'LG'
                                <br />
                                type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
                                <br />
                              </Pre>
                              <div className="mt-2">
                                <strong>Generates:</strong> <samp>"7-FURN-911-SM"</samp>, <samp>"3-ELEC-742-M"</samp>, etc.
                              </div>
                              <div className="mt-3">
                                <strong>Supported placeholders:</strong>
                              </div>
                              <div>
                                • <samp>${'{'}number{'}'}</samp> - random number<br />
                                • <samp>${'{'}string{'}'}</samp> - random string<br />
                                • <samp>${'{'}boolean{'}'}</samp> - "true" or "false"<br />
                                • <samp>${'{'}YourType{'}'}</samp> - any custom type alias
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                          <AccordionItem value="semantic-types" className="border-none">
                            <AccordionTrigger className="text-xs text-muted-foreground py-2 hover:no-underline">
                              🎯 Pro: Semantic Type Aliases
                            </AccordionTrigger>
                            <AccordionContent className="text-xs text-muted-foreground space-y-2 pb-2">
                              <div>
                                Name your type aliases semantically to get smart mock data generation. The generator uses the type name as a hint to produce realistic values.
                              </div>
                              <div className="mt-3">
                                <strong>Example - People Data:</strong>
                              </div>
                              <Pre onTrigger={(code) => { setInterfaceCode(code); setTimeout(() => handleGenerateMock.current()) }}>
                                interface Root {'{'}
                                <br />
                                {"  "}residents: `${'{First}'} ${'{Age}'}`[]
                                <br />
                                {"  "}address: `Home: ${'{string}'}`
                                <br />
                                {'}'}
                                <br /><br />
                                type First = string
                                <br />
                                type Age = number
                              </Pre>
                              <div className="mt-2">
                                <strong>Generates:</strong> <samp>residents: [ "Ebony 26", "Henry 31" ], address: "Home: 123 Main St"</samp>
                              </div>
                              <div className="mt-3">
                                Because <samp>First</samp> and <samp>Age</samp> match recognized keywords, they generate realistic names and ages instead of random strings/numbers.
                              </div>
                              <div className="mt-3">
                                <strong>Bonus:</strong> Field name awareness also works with primitive types in templates!
                              </div>
                              <div>
                                • e.g. <samp>age: `Years: ${'{number}'}`</samp> is equivalent to <samp>age: `Years: ${'{Age}'}`</samp><br />
                                • <samp>address: `Home: ${'{string}'}`</samp> → <samp>"Home: 123 Main St"</samp><br />
                                • <samp>email: `Contact: ${'{string}'}`</samp> → <samp>"Contact: john@example.com"</samp><br />
                              </div>
                              <div className="text-xs mt-2">
                                The field name is used as a hint when generating primitive placeholders.
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                          <AccordionItem value="typescript-errors" className="border-none">
                            <AccordionTrigger className="text-xs text-muted-foreground py-2 hover:no-underline">
                              🤯 Mind-blowing: TypeScript Errors That Still Work
                            </AccordionTrigger>
                            <AccordionContent className="text-xs text-muted-foreground space-y-2 pb-2">
                              <div>
                                The generator can handle certain TypeScript patterns that technically violate TypeScript rules but are useful for mock data generation:
                              </div>
                              <div className="mt-2">
                                • <strong>Index signatures with type aliases:</strong> <samp>{'{'} [key: First]: Age {'}'}</samp> - TypeScript complains but we use them as hints
                              </div>
                              <div>
                                • <strong>Complex template literals:</strong> Deep nesting causes "excessively deep" warnings but generates fine
                              </div>
                              <div className="mt-3">
                                <ExploreButton className="w-full" />
                              </div>
                              <div className="text-xs mt-2 text-yellow-500">
                                These errors won't prevent generation - the tool focuses on your intent!
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>

                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 overflow-hidden">
                  <Textarea
                    ref={interfaceTextareaRef}
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
                      placeholder='{"name": "John", "age": 30}'
                    />
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

            {inputMode === 'interface' && (
              <Card>
                <CardHeader>
                  <CardTitle>Generation Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid w-full max-w-sm items-end gap-3">
                      <Label htmlFor="quantity">Number of Records</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        max="100"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      />
                    </div>
                    <div className="grid w-full max-w-sm items-end gap-3">
                      <Label htmlFor="seed" className="flex items-center gap-1 flex-wrap">
                        <span>Seed (optional)</span>
                        {recentSeeds.length > 0 && (
                          <div className="text-muted-foreground">
                            <span>recent:</span>
                            {recentSeeds.map((s, i) => (
                              <Fragment key={s}>
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => {
                                    setSeed(s)
                                    setTimeout(() => handleGenerateMock.current(), 10)
                                  }}
                                  className="text-primary hover:underline cursor-pointer"
                                >
                                  {s}
                                </button>
                                {i < recentSeeds.length - 1 ? ',' : ''}
                              </Fragment>
                            ))}
                          </div>
                        )}
                      </Label>
                      <Input
                        id="seed"
                        type="number"
                        placeholder="Random"
                        value={seed ?? ''}
                        onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => handleGenerateMock.current(true)}
                    disabled={isGenerating}
                    className="w-full"
                    size="lg"
                    variant={hasValidationWarning ? "destructive" : undefined}
                  >
                    {isGenerating ? 'Generating...' : (
                      <span className="flex items-center justify-center gap-2">
                        {hasValidationWarning ? "⚠️ Click to display errors" : "Generate Mock Data"}
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Output Section */}
          <div className="flex flex-col min-h-0">
            <Card className="flex flex-col h-full min-h-0">
              <CardHeader className="flex-shrink-0">
                {inputMode === 'json' ? (
                  <>
                    <div className="flex items-center justify-between relative">
                      <CardTitle>TypeScript Interface Preview</CardTitle>
                      <Button
                        onClick={handleUseInterface}
                        size="sm"
                        disabled={!generatedInterface.trim()}
                        className="absolute right-0 -top-1"
                      >
                        Use This Interface to Generate Mock Data
                      </Button>
                    </div>
                    <CardDescription>
                      {generatedInterface
                        ? 'Review the generated interface, then click above to proceed. You can edit it in the next step.'
                        : 'Type or paste JSON data to generate an interface'
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
                    {inputMode === 'interface' && (
                      <div className="text-xs text-yellow-400 mb-2">
                        ⚠️ Errors were encountered but generation will proceed. Some fields might be null or use fallback values.
                      </div>
                    )}
                    <p className="text-sm text-red-400 font-mono whitespace-pre-wrap">
                      {error}
                    </p>
                  </div>
                )}
                <div className="flex-1 flex flex-col min-h-0">
                  {inputMode === 'json' ? (
                    generatedInterface ? (
                      <CodeDisplay code={generatedInterface} language="typescript" />
                    ) : (
                      <div className="flex items-center justify-center h-full min-h-[400px] text-center text-neutral-500">
                        <div>
                          <p>Type or paste JSON data on the left</p>
                          <p className="text-sm mt-2">Interface will generate automatically</p>
                        </div>
                      </div>
                    )
                  ) : output ? (
                    <CodeDisplay code={output} language="json" />
                  ) : (
                    <div className="flex items-center justify-center h-full min-h-[400px] text-center text-neutral-500">
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

const DEFAULT_INTERFACE = `interface User {
  id: string
  name: string
  age: number
  contact: [phone: string, email: string]
  isActive: boolean
  role: 'admin' | 'user' | 'guest'
  tags: string[]
  children: [Child] | [Child, Child]
  address: Address
}

interface Address {
  street: string
  city: string
  country: string
}

type Child = \`\${First} \${Digit}\`
type First = string
type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
`

const CAPABILITIES_EXAMPLE = `interface Root {
  basics: Basics
  tuples: Tuples
  arrays: Arrays
  dicts: Dicts
  transformation: Transformation
  builtins: Builtins
}

interface Basics {
  value_by_type: First
  name_by_substitution: string
  template: \`\${First}: \${Age}\`
  union: Category | Size
  intersection: { name: string } & { children: \`\${First} \${Digit}\`[] }
  five_digit: FiveDigit
  twenty_digit: TwentyDigit
}

interface Tuples {
  tuple: [First, Age]
  namedTuple: [first: string, age: number]
  city: [string, \`\${number} - \${string}\`]
}

interface Arrays {
  arr_city: \`\${First} \${Age} - \${string}\`[]
  Arr_city: Array<\`\${First} \${Age} - \${string}\`>
  Set_city: Set<\`\${First} \${Age} - \${string}\`>
}

interface Dicts {
  objects: Obj[]
  Map_age: Map<First, number>
  record_name: Record<Age, string>
  map: {
    [last: string]: First
  }
  map_name: {
    [key: Digit]: string
  }
}

interface Transformation {
  lowercase: Lowercase<First>
  uppercase: Uppercase<First>
  capitalize: Capitalize<string>
  uncapitalize: Uncapitalize<First>
}

interface Builtins {
  required: Required<Obj>[]
  partial: Partial<Obj>[]
  promise: Promise<First>
  awaited: Awaited<First>
  readonly: Readonly<Obj>
  pick1: Pick<Point, "x">
  pick2: Pick<Point, "x" | "y">
  pickU: Pick<Point, Keys>
  omit1: Omit<Point, "x">
  omit2: Omit<Point, "x" | "y">
  omitU: Omit<Point, Keys>
}

type First = string
type Age = number
type Category = 'ELEC' | 'FURN' | 'CLTH'
type Size = 'SM' | 'MD' | 'LG'
type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
type FiveDigit = \`\${Digit}\${Digit}\${Digit}\${Digit}\${Digit}\`
type TwentyDigit = \`\${FiveDigit}\${FiveDigit}\${FiveDigit}\${FiveDigit}\`
type Obj = {
  required_name: string
  optional_age?: number
}
interface Point {
  x: number
  y: number
  z: number
}
type Keys = "x" | "y"

`
