import { faker } from '@faker-js/faker'

import type { InterfaceInfo, TypeInfo, GenerationConfig } from './types'

let random: () => number = () => { throw new Error('Random function not initialized. Call generateMockData first.') }

export function generateMockData(
  interfaces: InterfaceInfo[],
  config: GenerationConfig = {}
) {
  const { quantity = 1, seed: userSeed } = config

  const seed = userSeed !== undefined ? userSeed : Math.floor(Math.random() * 1000000)

  faker.seed(seed)
  random = faker.number.float

  const result: AnyObject[] = []

  for (let i = 0; i < quantity; i++) {
    // Find the first root interface (one that is not referenced by others)
    if (interfaces.length > 0) {
      const rootInterface = findRootInterface(interfaces)
      const mockData = generateObjectFromInterface(
        rootInterface,
        interfaces
      )
      result.push(mockData)
    }
  }

  return { seed, result }
}

function findRootInterface(interfaces: InterfaceInfo[]): InterfaceInfo {
  // Collect all interface names that are referenced by other interfaces
  const referencedNames = new Set<string>()

  const collectReferences = (typeInfo: TypeInfo) => {
    if (typeInfo.kind === 'unknown' && typeInfo.name) {
      referencedNames.add(typeInfo.name)
    }
    if (typeInfo.kind === 'array' && typeInfo.arrayElementType) {
      collectReferences(typeInfo.arrayElementType)
    }
    if (typeInfo.kind === 'object' && typeInfo.objectProperties) {
      for (const prop of Object.values(typeInfo.objectProperties)) {
        collectReferences(prop)
      }
    }
    if (typeInfo.kind === 'union' && typeInfo.unionTypes) {
      for (const unionType of typeInfo.unionTypes) {
        collectReferences(unionType)
      }
    }
  }

  // Scan all interfaces for references
  for (const iface of interfaces) {
    for (const prop of Object.values(iface.properties)) {
      collectReferences(prop)
    }
  }

  // Filter out type aliases (pseudo-interfaces with __value property)
  const actualInterfaces = interfaces.filter(iface => !iface.properties.__value)

  // Find interfaces that are NOT referenced (root interfaces)
  const rootInterfaces = actualInterfaces.filter(iface => !referencedNames.has(iface.name))

  // Return the first root interface, or the first actual interface if all are referenced
  return rootInterfaces.length > 0 ? rootInterfaces[0] : actualInterfaces[0]
}

function generateObjectFromInterface(
  interfaceInfo: InterfaceInfo,
  allInterfaces?: InterfaceInfo[]
): AnyObject {
  const obj: AnyObject = {}

  for (const [propName, typeInfo] of Object.entries(interfaceInfo.properties)) {
    // Skip optional properties randomly (30% chance of being undefined)
    if (typeInfo.isOptional && random() < 0.3) {
      continue
    }

    obj[propName] = generateValue(propName, typeInfo, allInterfaces)
  }

  return obj
}

function generateValue(
  fieldName: string,
  typeInfo: TypeInfo,
  allInterfaces?: InterfaceInfo[]
): unknown {
  // Handle literal types
  if (typeInfo.kind === 'literal') {
    return typeInfo.literalValue
  }

  // Handle template literal types
  if (typeInfo.kind === 'template' && typeInfo.templatePattern) {
    return generateTemplateValue(fieldName, typeInfo.templatePattern, allInterfaces)
  }

  // Handle enums
  if (typeInfo.kind === 'enum' && typeInfo.enumValues) {
    return faker.helpers.arrayElement(typeInfo.enumValues)
  }

  // Handle interface references (custom types)
  if (typeInfo.kind === 'unknown' && allInterfaces) {
    const referencedInterface = allInterfaces.find(iface => iface.name === typeInfo.name)
    if (referencedInterface) {
      // Check if this is a type alias stored as a pseudo-interface
      if (referencedInterface.properties.__value) {
        // Use the type alias name as a hint for better generation
        return generateValue(typeInfo.name, referencedInterface.properties.__value, allInterfaces)
      }
      return generateObjectFromInterface(referencedInterface, allInterfaces)
    }
  }

  // Handle arrays
  if (typeInfo.kind === 'array' && typeInfo.arrayElementType) {
    const length = faker.number.int({ min: 1, max: 5 })

    return Array.from({ length }, () =>
      generateValue(fieldName, typeInfo.arrayElementType!, allInterfaces)
    )
  }

  // Handle tuples: [Type1, Type2, ...]
  if (typeInfo.kind === 'tuple' && typeInfo.tupleElements) {
    return typeInfo.tupleElements.map(element => {
      // Use element name as hint if available (named tuples), otherwise use fieldName
      const elementHint = element.name || fieldName
      return generateValue(elementHint, element.type, allInterfaces)
    })
  }

  // Handle Map<K, V> - forward to Record handler
  if (typeInfo.kind === 'map') {
    // Create a synthetic Record type and recurse
    const syntheticRecordType: TypeInfo = {
      name: 'Record',
      kind: 'utility',
      utilityType: 'Record',
      utilityTypeArgs: [
        typeInfo.mapKeyType || { name: 'string', kind: 'string' },
        typeInfo.mapValueType || { name: 'string', kind: 'string' }
      ]
    }
    return generateValue(fieldName, syntheticRecordType, allInterfaces)
  }

  // Handle Set<T>
  if (typeInfo.kind === 'set') {
    const size = faker.number.int({ min: 2, max: 5 })
    const values: unknown[] = []
    for (let i = 0; i < size; i++) {
      const value = typeInfo.setElementType ? generateValue(fieldName, typeInfo.setElementType, allInterfaces) : faker.lorem.word()
      values.push(value)
    }
    // Return as array for JSON serialization
    return values
  }

  // Handle utility types
  if (typeInfo.kind === 'utility' && typeInfo.utilityType) {
    const baseType = typeInfo.utilityTypeArgs?.[0]

    if (!baseType) {
      return null
    }

    // String manipulation utilities
    if (['Lowercase', 'Uppercase', 'Capitalize', 'Uncapitalize'].includes(typeInfo.utilityType)) {
      // Use the base type's name as hint if it's a custom type, otherwise use fieldName
      // This makes both Lowercase<First> and name: Lowercase<string> work correctly
      const fieldHint = (baseType.kind === 'unknown' || baseType.kind === 'string') ? (baseType.name === 'string' ? fieldName : baseType.name) : fieldName
      const strValue = String(generateValue(fieldHint, baseType, allInterfaces))

      if (typeInfo.utilityType === 'Lowercase') return strValue.toLowerCase()
      if (typeInfo.utilityType === 'Uppercase') return strValue.toUpperCase()
      if (typeInfo.utilityType === 'Capitalize') return strValue.charAt(0).toUpperCase() + strValue.slice(1).toLowerCase()
      if (typeInfo.utilityType === 'Uncapitalize') return strValue.charAt(0).toLowerCase() + strValue.slice(1)
    }

    // Partial<T> | Required<T> - modify properties' optionality
    if (baseType.kind === 'unknown' && allInterfaces && (typeInfo.utilityType === 'Partial' || typeInfo.utilityType === 'Required')) {
      const referencedInterface = allInterfaces.find(iface => iface.name === baseType.name)
      if (referencedInterface) {
        // Create a modified interface with all properties marked as optional or required
        const partialInterface: InterfaceInfo = {
          name: referencedInterface.name,
          properties: {}
        }

        const isOptional = typeInfo.utilityType === 'Partial'

        for (const [propName, propType] of Object.entries(referencedInterface.properties)) {
          partialInterface.properties[propName] = {
            ...propType,
            isOptional
          }
        }

        return generateObjectFromInterface(partialInterface, allInterfaces)
      }
    }

    // Other object manipulation utilities
    if (['Readonly', 'Promise'].includes(typeInfo.utilityType)) {
      // For Readonly/Promise, generate the base type
      return generateValue(fieldName, baseType, allInterfaces)
    }

    // Record<K, V> - generate an object with keys of type K and values of type V
    if (typeInfo.utilityType === 'Record') {
      const keyType = typeInfo.utilityTypeArgs?.[0]
      const valueType = typeInfo.utilityTypeArgs?.[1]

      if (keyType && valueType) {
        const size = faker.number.int({ min: 2, max: 5 })
        const record: AnyObject = {}

        for (let i = 0; i < size; i++) {
          // Use keyHint if available (from index signature parameter name), otherwise use 'key'
          const keyFieldHint = keyType.keyHint || (keyType.kind === 'unknown' ? keyType.name : 'key')
          const key = String(generateValue(keyFieldHint, keyType, allInterfaces))

          // For value hint: use fieldName if value is a primitive type, otherwise use the type name
          const isPrimitive = ['string', 'number', 'boolean'].includes(valueType.name)
          const valueFieldHint = isPrimitive ? fieldName : (valueType.name || fieldName)
          record[key] = generateValue(valueFieldHint, valueType, allInterfaces)
        }

        return record
      }
    }

    // Pick<T, K> and Omit<T, K> - filter properties based on keys
    if (['Pick', 'Omit'].includes(typeInfo.utilityType) && baseType.kind === 'unknown' && allInterfaces) {
      const referencedInterface = allInterfaces.find(iface => iface.name === baseType.name)

      if (referencedInterface) {
        const keysType = typeInfo.utilityTypeArgs?.[1]
        const keyNames = new Set<string>()

        // Helper function to recursively extract key names from a type
        const extractKeyNames = (type: TypeInfo | undefined): void => {
          if (!type) return

          if (type.kind === 'literal') {
            keyNames.add(String(type.literalValue))
          } else if (type.kind === 'enum' && type.enumValues) {
            // When all literals in a union, it becomes an enum
            type.enumValues.forEach(value => keyNames.add(String(value)))
          } else if (type.kind === 'union' && type.unionTypes) {
            // Process each type in the union (including nested type aliases)
            type.unionTypes.forEach(unionType => {
              extractKeyNames(unionType)
            })
          } else if (type.kind === 'unknown' && allInterfaces) {
            // Resolve type alias reference
            const typeAlias = allInterfaces.find(iface => iface.name === type.name)
            if (typeAlias?.properties.__value) {
              extractKeyNames(typeAlias.properties.__value)
            }
          }
        }

        extractKeyNames(keysType)

        // Create filtered interface
        const filteredInterface: InterfaceInfo = {
          name: referencedInterface.name,
          properties: {}
        }

        for (const [propName, propType] of Object.entries(referencedInterface.properties)) {
          const shouldInclude = typeInfo.utilityType === 'Pick'
            ? keyNames.has(propName)
            : !keyNames.has(propName)

          if (shouldInclude) {
            filteredInterface.properties[propName] = propType
          }
        }

        return generateObjectFromInterface(filteredInterface, allInterfaces)
      }
    }

    // Fallback: generate the base type
    return generateValue(fieldName, baseType, allInterfaces)
  }

  // Handle objects
  if (typeInfo.kind === 'object' && typeInfo.objectProperties) {
    const nestedObj: AnyObject = {}
    for (const [nestedProp, nestedType] of Object.entries(typeInfo.objectProperties)) {
      if (nestedType.isOptional && random() < 0.3) {
        continue
      }
      nestedObj[nestedProp] = generateValue(nestedProp, nestedType, allInterfaces)
    }
    return nestedObj
  }

  // Handle unions - pick one type randomly
  if (typeInfo.kind === 'union' && typeInfo.unionTypes) {
    const selectedType = faker.helpers.arrayElement(typeInfo.unionTypes)
    return generateValue(fieldName, selectedType, allInterfaces)
  }

  // Handle intersections - merge all types
  if (typeInfo.kind === 'intersection' && typeInfo.intersectionTypes) {
    const merged: AnyObject = {}
    for (const intersectedType of typeInfo.intersectionTypes) {
      const value = generateValue(fieldName, intersectedType, allInterfaces)
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(merged, value)
      }
    }
    return merged
  }

  // Handle primitive types with smart field name detection
  return generatePrimitiveValue(fieldName, typeInfo)
}

function generatePrimitiveValue(
  fieldName: string,
  typeInfo: TypeInfo
): unknown {
  // Use typeHint if available (for type aliases like First, Age)
  const hint = typeInfo.typeHint || fieldName
  const lowerFieldName = hint.toLowerCase()

  switch (typeInfo.kind) {
    case 'string':
      return generateStringValue(lowerFieldName)

    case 'number':
      return generateNumberValue(lowerFieldName)

    case 'boolean':
      return faker.datatype.boolean()

    case 'date':
      return faker.date.recent().toISOString()

    case 'unknown':
      console.warn(`Unknown type '${typeInfo.name}' for field '${fieldName}'. Generating null. Check for typos in your interface.`)
      return null

    default:
      console.warn(`Unhandled type kind '${typeInfo.kind}' for field '${fieldName}'. Generating null.`)
      return null
  }
}

function generateStringValue(fieldName: string): string {
  const included = (term: string) => fieldName.includes(term)
  // Smart field name detection
  if (included('email')) return faker.internet.email()
  if (['username', 'user'].some(included)) return faker.internet.username()
  if (included('password')) return faker.internet.password()
  if (included('phone')) return faker.phone.number()
  if (['url', 'website'].some(included)) return faker.internet.url()
  if (['avatar', 'image'].some(included)) return faker.image.avatar()
  if (included('color')) return faker.color.human()
  if (included('country')) return faker.location.country()
  if (included('city')) return faker.location.city()
  if (['street', 'address'].some(included)) return faker.location.streetAddress()
  if (['zipcode', 'zip', 'postal'].some(included)) return faker.location.zipCode()
  if (['state', 'province'].some(included)) return faker.location.state()
  if (['company', 'organization', 'org'].some(included)) return faker.company.name()
  if (['job', 'title', 'position'].some(included)) return faker.person.jobTitle()
  if (['description', 'bio'].some(included)) return faker.lorem.paragraph()
  if (['firstname', 'first'].some(included)) return faker.person.firstName()
  if (['lastname', 'last'].some(included)) return faker.person.lastName()
  if (included('name') && !included('username')) return faker.person.fullName()
  if (['uuid', 'id'].some(included)) return faker.string.uuid()
  if (included('currency')) return faker.finance.currencyCode()
  if (['price', 'amount'].some(included)) return faker.commerce.price()
  if (included('product')) return faker.commerce.productName()
  if (included('department')) return faker.commerce.department()
  // Default to a word or sentence
  if (['text', 'content'].some(included)) {
    return faker.lorem.sentence()
  }

  return faker.lorem.word()
}

function generateTemplateValue(fieldName: string, pattern: string, allInterfaces?: InterfaceInfo[]): string {
  // Remove backticks and parse template pattern like `${number}-${number}`
  const cleanPattern = pattern.replace(/`/g, '')

  // Replace each ${type} with generated value
  return cleanPattern.replace(/\$\{(\w+)\}/g, (_, name) => {
    const kind = name.toLowerCase()

    if (kind === 'number' || kind === 'string' || kind === 'boolean') {
      const syntheticTypeInfo: TypeInfo = {
        name,
        kind
      }
      const value = generatePrimitiveValue(fieldName, syntheticTypeInfo)
      return String(value)
    }

    // Try to resolve as a type reference (interface or type alias)
    // Create a synthetic TypeInfo with kind 'unknown' which will trigger the lookup in generateValue
    // Use the type name as fieldName hint for better smart field detection
    const syntheticTypeInfo: TypeInfo = {
      name,
      kind: 'unknown'
    }
    const value = generateValue(name, syntheticTypeInfo, allInterfaces)
    return String(value)
  })
}

function generateNumberValue(fieldName: string): number {
  const included = (term: string) => fieldName.includes(term)
  if (included('age')) return faker.number.int({ min: 18, max: 80 })
  if (included('year')) return faker.number.int({ min: 1900, max: 2024 })
  if (included('month')) return faker.number.int({ min: 1, max: 12 })
  if (included('day')) return faker.number.int({ min: 1, max: 31 })
  if (included('hour')) return faker.number.int({ min: 0, max: 23 })
  if (['minute', 'second'].some(included)) return faker.number.int({ min: 0, max: 59 })
  if (['price', 'amount', 'cost'].some(included)) return faker.number.float({ min: 0, max: 1000, fractionDigits: 2 })
  if (['quantity', 'count'].some(included)) return faker.number.int({ min: 1, max: 100 })
  if (['percent', 'rate'].some(included)) return faker.number.int({ min: 0, max: 100 })
  if (fieldName.includes('rating')) return faker.number.float({ min: 0, max: 5, fractionDigits: 1 })
  if (['latitude', 'lat'].some(included)) return faker.location.latitude()
  if (['longitude', 'lng', 'lon'].some(included)) return faker.location.longitude()
  return faker.number.int({ min: 1, max: 1000 })
}
