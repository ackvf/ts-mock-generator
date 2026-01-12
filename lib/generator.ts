import { faker } from '@faker-js/faker'
import type { InterfaceInfo, TypeInfo, GenerationConfig, AIEnhancement } from './types'

export function generateMockData(
  interfaces: InterfaceInfo[],
  config: GenerationConfig = {},
  enhancements?: AIEnhancement[]
): any[] {
  const { count = 1, seed } = config

  if (seed !== undefined) {
    faker.seed(seed)
  }

  const results: any[] = []

  for (let i = 0; i < count; i++) {
    // Generate data for the first interface (main one)
    if (interfaces.length > 0) {
      const mockData = generateObjectFromInterface(
        interfaces[0],
        enhancements,
        interfaces
      )
      results.push(mockData)
    }
  }

  return results
}

function generateObjectFromInterface(
  interfaceInfo: InterfaceInfo,
  enhancements?: AIEnhancement[],
  allInterfaces?: InterfaceInfo[]
): any {
  const obj: any = {}

  for (const [propName, typeInfo] of Object.entries(interfaceInfo.properties)) {
    // Skip optional properties randomly (30% chance of being undefined)
    if (typeInfo.isOptional && Math.random() < 0.3) {
      continue
    }

    const enhancement = enhancements?.find(e => e.fieldName === propName)

    obj[propName] = generateValue(propName, typeInfo, enhancement, allInterfaces)
  }

  return obj
}

function generateValue(
  fieldName: string,
  typeInfo: TypeInfo,
  enhancement?: AIEnhancement,
  allInterfaces?: InterfaceInfo[]
): any {
  // Handle literal types
  if (typeInfo.kind === 'literal') {
    return typeInfo.literalValue
  }

  // Handle enums
  if (typeInfo.kind === 'enum' && typeInfo.enumValues) {
    if (enhancement?.suggestions.options) {
      return faker.helpers.arrayElement(enhancement.suggestions.options)
    }
    return faker.helpers.arrayElement(typeInfo.enumValues)
  }

  // Handle interface references (custom types)
  if (typeInfo.kind === 'unknown' && allInterfaces) {
    const referencedInterface = allInterfaces.find(iface => iface.name === typeInfo.name)
    if (referencedInterface) {
      return generateObjectFromInterface(referencedInterface, undefined, allInterfaces)
    }
  }

  // Handle arrays
  if (typeInfo.kind === 'array' && typeInfo.arrayElementType) {
    const length = enhancement?.suggestions.min
      ? faker.number.int({ min: enhancement.suggestions.min, max: enhancement.suggestions.max || 10 })
      : faker.number.int({ min: 1, max: 5 })

    return Array.from({ length }, () =>
      generateValue(fieldName, typeInfo.arrayElementType!, enhancement, allInterfaces)
    )
  }

  // Handle objects
  if (typeInfo.kind === 'object' && typeInfo.objectProperties) {
    const nestedObj: any = {}
    for (const [nestedProp, nestedType] of Object.entries(typeInfo.objectProperties)) {
      if (nestedType.isOptional && Math.random() < 0.3) {
        continue
      }
      nestedObj[nestedProp] = generateValue(nestedProp, nestedType, undefined, undefined, allInterfaces)
    }
    return nestedObj
  }

  // Handle unions - pick one type randomly
  if (typeInfo.kind === 'union' && typeInfo.unionTypes) {
    const selectedType = faker.helpers.arrayElement(typeInfo.unionTypes)
    return generateValue(fieldName, selectedType, exampleValues, enhancement, allInterfaces)
  }

  // Handle primitive types with smart field name detection
  return generatePrimitiveValue(fieldName, typeInfo, enhancement)
}

function generatePrimitiveValue(
  fieldName: string,
  typeInfo: TypeInfo,
  enhancement?: AIEnhancement
): any {
  const lowerFieldName = fieldName.toLowerCase()

  switch (typeInfo.kind) {
    case 'string':
      return generateStringValue(lowerFieldName, enhancement)

    case 'number':
      if (enhancement?.suggestions) {
        return faker.number.int({
          min: enhancement.suggestions.min || 0,
          max: enhancement.suggestions.max || 1000
        })
      }
      return generateNumberValue(lowerFieldName)

    case 'boolean':
      return faker.datatype.boolean()

    case 'date':
      return faker.date.recent().toISOString()

    default:
      return null
  }
}

function generateStringValue(fieldName: string, enhancement?: AIEnhancement): string {
  // Use AI enhancement pattern if available
  if (enhancement?.suggestions.pattern) {
    return faker.helpers.fake(enhancement.suggestions.pattern)
  }

  // Smart field name detection
  if (fieldName.includes('email')) return faker.internet.email()
  if (fieldName.includes('username') || fieldName === 'user') return faker.internet.username()
  if (fieldName.includes('password')) return faker.internet.password()
  if (fieldName.includes('phone')) return faker.phone.number()
  if (fieldName.includes('url') || fieldName.includes('website')) return faker.internet.url()
  if (fieldName.includes('avatar') || fieldName.includes('image')) return faker.image.avatar()
  if (fieldName.includes('color')) return faker.color.human()
  if (fieldName.includes('country')) return faker.location.country()
  if (fieldName.includes('city')) return faker.location.city()
  if (fieldName.includes('street') || fieldName.includes('address')) return faker.location.streetAddress()
  if (fieldName.includes('zipcode') || fieldName.includes('zip') || fieldName.includes('postal')) return faker.location.zipCode()
  if (fieldName.includes('state') || fieldName.includes('province')) return faker.location.state()
  if (fieldName.includes('company') || fieldName.includes('organization')) return faker.company.name()
  if (fieldName.includes('job') || fieldName.includes('title') || fieldName.includes('position')) return faker.person.jobTitle()
  if (fieldName.includes('description') || fieldName.includes('bio')) return faker.lorem.paragraph()
  if (fieldName.includes('firstname') || fieldName === 'first') return faker.person.firstName()
  if (fieldName.includes('lastname') || fieldName === 'last') return faker.person.lastName()
  if (fieldName.includes('name') && !fieldName.includes('username')) return faker.person.fullName()
  if (fieldName.includes('uuid') || fieldName === 'id') return faker.string.uuid()
  if (fieldName.includes('currency')) return faker.finance.currencyCode()
  if (fieldName.includes('price') || fieldName.includes('amount')) return faker.commerce.price()
  if (fieldName.includes('product')) return faker.commerce.productName()
  if (fieldName.includes('department')) return faker.commerce.department()

  // Default to a word or sentence
  if (fieldName.includes('text') || fieldName.includes('content')) {
    return faker.lorem.sentence()
  }

  return faker.lorem.word()
}

function generateNumberValue(fieldName: string): number {
  if (fieldName.includes('age')) return faker.number.int({ min: 18, max: 80 })
  if (fieldName.includes('year')) return faker.number.int({ min: 1900, max: 2024 })
  if (fieldName.includes('month')) return faker.number.int({ min: 1, max: 12 })
  if (fieldName.includes('day')) return faker.number.int({ min: 1, max: 31 })
  if (fieldName.includes('hour')) return faker.number.int({ min: 0, max: 23 })
  if (fieldName.includes('minute') || fieldName.includes('second')) return faker.number.int({ min: 0, max: 59 })
  if (fieldName.includes('price') || fieldName.includes('amount') || fieldName.includes('cost')) {
    return faker.number.float({ min: 0, max: 1000, fractionDigits: 2 })
  }
  if (fieldName.includes('quantity') || fieldName.includes('count')) return faker.number.int({ min: 1, max: 100 })
  if (fieldName.includes('percent') || fieldName.includes('rate')) return faker.number.int({ min: 0, max: 100 })
  if (fieldName.includes('rating')) return faker.number.float({ min: 0, max: 5, fractionDigits: 1 })
  if (fieldName.includes('latitude') || fieldName.includes('lat')) return faker.location.latitude()
  if (fieldName.includes('longitude') || fieldName.includes('lng') || fieldName.includes('lon')) {
    return faker.location.longitude()
  }

  return faker.number.int({ min: 1, max: 1000 })
}

function analyzeExamplePatterns(examples: any[]): Map<string, any[]> {
  const patterns = new Map<string, any[]>()

  for (const example of examples) {
    if (typeof example === 'object' && example !== null) {
      for (const [key, value] of Object.entries(example)) {
        if (!patterns.has(key)) {
          patterns.set(key, [])
        }
        if (value !== null && value !== undefined) {
          patterns.get(key)!.push(value)
        }
      }
    }
  }

  return patterns
}
