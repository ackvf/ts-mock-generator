type JsonValue = string | number | boolean | null | JsonObject | JsonArray
type JsonObject = { [key: string]: JsonValue }
type JsonArray = JsonValue[]

// Generate TypeScript interfaces from JSON examples
export function generateInterfaceFromJSON(json: string): string {
  try {
    const parsed = JSON.parse(json)
    const data = Array.isArray(parsed) ? parsed : [parsed]

    if (data.length === 0) {
      throw new Error('No data provided')
    }

    const generatedInterfaces = new Map<string, string>()
    const interfaceStructures = new Map<string, string>() // Maps structure hash to interface name
    const mainInterfaceName = 'Root'
    const usedNames = new Set<string>([mainInterfaceName])

    const mainInterface = generateInterface(data, mainInterfaceName, generatedInterfaces, usedNames, interfaceStructures)

    // Collect all interfaces (main interface first, then sub-interfaces)
    const allInterfaces: string[] = [mainInterface]
    generatedInterfaces.forEach(code => allInterfaces.push(code))

    return allInterfaces.join('\n\n')
  } catch (error) {
    throw new Error(`Failed to generate interface: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function generateInterface(
  data: JsonValue[],
  interfaceName: string,
  generatedInterfaces: Map<string, string>,
  usedNames: Set<string>,
  interfaceStructures: Map<string, string>
): string {
  // Merge all objects to get all possible properties
  const mergedProperties = new Map<string, Set<JsonValue>>()

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

  // Generate interface properties
  const properties: string[] = []

  mergedProperties.forEach((values, key) => {
    const valuesArray = Array.from(values).filter(v => v !== null && v !== undefined)

    if (valuesArray.length === 0) {
      properties.push(`  ${formatKey(key)}: any`)
      return
    }

    const types = inferTypes(valuesArray, key, generatedInterfaces, usedNames, interfaceStructures)
    const hasNull = Array.from(values).some(v => v === null || v === undefined)
    const optional = hasNull ? '?' : ''

    properties.push(`  ${formatKey(key)}${optional}: ${types}`)
  })

  return `export interface ${interfaceName} {\n${properties.join('\n')}\n}`
}

function formatKey(key: string): string {
  // If key has special characters or starts with number, quote it
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
    return key
  }
  return `"${key}"`
}

function inferTypes(
  values: JsonValue[],
  propertyName: string,
  generatedInterfaces: Map<string, string>,
  usedNames: Set<string>,
  interfaceStructures: Map<string, string>
): string {
  const types = new Set<string>()

  values.forEach(value => {
    const type = inferType(value, propertyName, generatedInterfaces, usedNames, interfaceStructures)
    if (type) types.add(type)
  })

  if (types.size === 0) return 'any'
  if (types.size === 1) return Array.from(types)[0]

  // Multiple types - create union
  return Array.from(types).join(' | ')
}

function inferType(
  value: JsonValue,
  propertyName: string,
  generatedInterfaces: Map<string, string>,
  usedNames: Set<string>,
  interfaceStructures: Map<string, string>
): string | null {
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

        // Check if array contains objects
        const objectItems = value.filter(v => typeof v === 'object' && v !== null && !Array.isArray(v))

        if (objectItems.length > 0) {
          // Generate separate interface for array elements
          const typeName = toPascalCase(propertyName)
          const interfaceCode = generateInterface(objectItems, typeName, generatedInterfaces, usedNames, interfaceStructures)

          // Check if this structure already exists
          const structureHash = getStructureHash(interfaceCode)
          const existingName = interfaceStructures.get(structureHash)

          if (existingName) {
            // Reuse existing interface
            return `${existingName}[]`
          }

          // New structure - register it
          const uniqueName = ensureUniqueName(typeName, usedNames)
          const finalInterfaceCode = interfaceCode.replace(typeName, uniqueName)
          interfaceStructures.set(structureHash, uniqueName)
          generatedInterfaces.set(uniqueName, finalInterfaceCode)
          return `${uniqueName}[]`
        }

        // For primitive arrays
        const elementTypes = inferTypes(value, propertyName, generatedInterfaces, usedNames, interfaceStructures)
        return `${elementTypes}[]`
      }
      if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
        return 'Date'
      }

      // Nested object - generate separate interface
      const typeName = toPascalCase(propertyName)
      const interfaceCode = generateInterface([value], typeName, generatedInterfaces, usedNames, interfaceStructures)

      // Check if this structure already exists
      const structureHash = getStructureHash(interfaceCode)
      const existingName = interfaceStructures.get(structureHash)

      if (existingName) {
        // Reuse existing interface
        return existingName
      }

      // New structure - register it
      const uniqueName = ensureUniqueName(typeName, usedNames)
      const finalInterfaceCode = interfaceCode.replace(typeName, uniqueName)
      interfaceStructures.set(structureHash, uniqueName)
      generatedInterfaces.set(uniqueName, finalInterfaceCode)
      return uniqueName
    default:
      return 'any'
  }
}

function toPascalCase(str: string): string {
  return str
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('')
    .replace(/[^a-zA-Z0-9]/g, '') || 'GeneratedType'
}

function ensureUniqueName(baseName: string, usedNames: Set<string>): string {
  let name = baseName
  let counter = 1

  while (usedNames.has(name)) {
    name = `${baseName}${counter}`
    counter++
  }

  usedNames.add(name)
  return name
}

function getStructureHash(interfaceCode: string): string {
  // Extract just the property definitions (ignoring the interface name)
  // This creates a hash of the structure, not the name
  const match = interfaceCode.match(/\{([\s\S]*)\}/)
  return match ? match[1].trim() : interfaceCode
}
