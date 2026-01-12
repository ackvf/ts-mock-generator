// Generate TypeScript interfaces from JSON examples

export function generateInterfaceFromJSON(json: string, interfaceName: string = 'GeneratedInterface'): string {
  try {
    const parsed = JSON.parse(json)
    const data = Array.isArray(parsed) ? parsed : [parsed]

    if (data.length === 0) {
      throw new Error('No data provided')
    }

    // Merge all objects to get all possible properties
    const mergedProperties = new Map<string, Set<any>>()

    data.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.entries(item).forEach(([key, value]) => {
          if (!mergedProperties.has(key)) {
            mergedProperties.set(key, new Set())
          }
          mergedProperties.get(key)!.add(value)
        })
      }
    })

    // Generate interface
    const properties: string[] = []

    mergedProperties.forEach((values, key) => {
      const valuesArray = Array.from(values).filter(v => v !== null && v !== undefined)

      if (valuesArray.length === 0) {
        properties.push(`  ${formatKey(key)}: any`)
        return
      }

      const types = inferTypes(valuesArray)
      const hasNull = Array.from(values).some(v => v === null || v === undefined)
      const optional = hasNull ? '?' : ''

      properties.push(`  ${formatKey(key)}${optional}: ${types}`)
    })

    return `export interface ${interfaceName} {\n${properties.join('\n')}\n}`
  } catch (error) {
    throw new Error(`Failed to generate interface: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function formatKey(key: string): string {
  // If key has special characters or starts with number, quote it
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
    return key
  }
  return `"${key}"`
}

function inferTypes(values: any[]): string {
  const types = new Set<string>()

  values.forEach(value => {
    const type = inferType(value)
    if (type) types.add(type)
  })

  if (types.size === 0) return 'any'
  if (types.size === 1) return Array.from(types)[0]

  // Multiple types - create union
  return Array.from(types).join(' | ')
}

function inferType(value: any): string | null {
  if (value === null || value === undefined) {
    return null
  }

  const jsType = typeof value

  switch (jsType) {
    case 'string':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'object':
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return 'any[]'
        }
        // Infer array element type
        const elementTypes = inferTypes(value)
        return `${elementTypes}[]`
      }
      if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
        return 'Date'
      }
      // Nested object - generate inline type
      return generateInlineType(value)
    default:
      return 'any'
  }
}

function generateInlineType(obj: any): string {
  const properties: string[] = []

  Object.entries(obj).forEach(([key, value]) => {
    const type = inferType(value)
    if (type) {
      properties.push(`${formatKey(key)}: ${type}`)
    }
  })

  if (properties.length === 0) return 'object'

  return `{ ${properties.join('; ')} }`
}
