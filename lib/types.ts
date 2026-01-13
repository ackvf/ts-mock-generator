// Core types for the mock data generator

export interface TypeInfo {
  /** The identifier or type name (e.g., "User", "id", "string"). For primitive types, this is the type itself. For complex types, this is typically the property or interface name. */
  name: string
  kind: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'enum' | 'union' | 'intersection' | 'literal' | 'template' | 'unknown' | 'map' | 'set' | 'utility' | 'tuple'
  isOptional?: boolean
  isArray?: boolean
  arrayElementType?: TypeInfo
  objectProperties?: AnyObject<TypeInfo>
  enumValues?: Array<string | number | boolean>
  unionTypes?: TypeInfo[]
  intersectionTypes?: TypeInfo[]
  typeHint?: string
  literalValue?: string | number | boolean
  templatePattern?: string
  utilityType?: UtilityType
  utilityTypeArgs?: TypeInfo[]
  mapKeyType?: TypeInfo
  mapValueType?: TypeInfo
  setElementType?: TypeInfo
  keyHint?: string
  tupleElements?: Array<{ type: TypeInfo; name?: string }>
}

export interface InterfaceInfo {
  name: string
  properties: AnyObject<TypeInfo>
}

export interface GenerationConfig {
  quantity?: number
  seed?: number
}

export interface IndexSignature {
  keyType: TypeInfo | null
  valueType: TypeInfo | null
  keyParamName?: string
}

export type UtilityType = 'Partial' | 'Required' | 'Pick' | 'Omit' | 'Readonly' | 'Record' | 'Lowercase' | 'Uppercase' | 'Capitalize' | 'Uncapitalize' | 'Promise' | 'Awaited'

export function isIndexSignature(obj: IndexSignature | null): obj is IndexSignature {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'keyType' in obj &&
    'valueType' in obj
  )
}
