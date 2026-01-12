// Core types for the mock data generator

export interface TypeInfo {
  name: string
  kind: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'enum' | 'union' | 'literal' | 'unknown'
  isOptional?: boolean
  isArray?: boolean
  arrayElementType?: TypeInfo
  objectProperties?: Record<string, TypeInfo>
  enumValues?: string[]
  unionTypes?: TypeInfo[]
  literalValue?: string | number | boolean
}

export interface InterfaceInfo {
  name: string
  properties: Record<string, TypeInfo>
}

export interface GenerationConfig {
  count?: number
  seed?: number
}

export interface AIEnhancement {
  fieldName: string
  suggestions: {
    min?: number
    max?: number
    pattern?: string
    options?: string[]
    description?: string
  }
}
