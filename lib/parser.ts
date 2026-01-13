import * as ts from 'typescript'

import { isIndexSignature, type IndexSignature, type InterfaceInfo, type TypeInfo, type UtilityType } from './types'

export function parseTypeScriptInterface(code: string): InterfaceInfo[] {
  const sourceFile = ts.createSourceFile(
    'temp.ts',
    code,
    ts.ScriptTarget.Latest,
    true
  )

  const interfaces: InterfaceInfo[] = []
  const typeAliases = new Map<string, ts.TypeNode>()

  // First pass: collect type aliases
  function collectTypeAliases(node: ts.Node) {
    if (ts.isTypeAliasDeclaration(node) && node.type) {
      typeAliases.set(node.name.text, node.type)
    }
    ts.forEachChild(node, collectTypeAliases)
  }

  // Second pass: process interfaces
  function visit(node: ts.Node) {

    if (ts.isInterfaceDeclaration(node)) {
      const interfaceInfo: InterfaceInfo = {
        name: node.name.text,
        properties: {}
      }

      node.members.forEach(member => {
        if (ts.isPropertySignature(member) && member.name) {
          const propertyName = getPropertyName(member.name, sourceFile)
          const isOptional = !!member.questionToken

          // Preserve type alias names as hints
          let typeHint: string | undefined
          if (member.type && ts.isTypeReferenceNode(member.type)) {
            typeHint = member.type.typeName.getText(sourceFile)
          }

          const typeInfo = getTypeInfo(member.type, sourceFile, typeAliases)

          if (typeInfo) {
            interfaceInfo.properties[propertyName] = {
              ...typeInfo,
              isOptional,
              typeHint: typeHint || typeInfo.typeHint
            }
          }
        }
      })

      interfaces.push(interfaceInfo)
    }

    // Also parse type aliases as interfaces
    if (ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type)) {
      const interfaceInfo: InterfaceInfo = {
        name: node.name.text,
        properties: {}
      }

      node.type.members.forEach(member => {
        if (ts.isPropertySignature(member) && member.name) {
          const propertyName = getPropertyName(member.name, sourceFile)
          const isOptional = !!member.questionToken

          // Preserve type alias names as hints
          let typeHint: string | undefined
          if (member.type && ts.isTypeReferenceNode(member.type)) {
            typeHint = member.type.typeName.getText(sourceFile)
          }

          const typeInfo = getTypeInfo(member.type, sourceFile, typeAliases)

          if (typeInfo) {
            interfaceInfo.properties[propertyName] = {
              ...typeInfo,
              isOptional,
              typeHint: typeHint || typeInfo.typeHint
            }
          }
        }
      })

      interfaces.push(interfaceInfo)
    }

    // Also parse all type aliases as pseudo-interfaces
    // Store them as single-property interfaces so they can be resolved during generation
    if (ts.isTypeAliasDeclaration(node)) {
      const typeInfo = getTypeInfo(node.type, sourceFile, typeAliases)
      if (typeInfo) {
        const interfaceInfo: InterfaceInfo = {
          name: node.name.text,
          properties: {
            __value: typeInfo
          }
        }
        interfaces.push(interfaceInfo)
      }
    }

    ts.forEachChild(node, visit)
  }

  collectTypeAliases(sourceFile)
  visit(sourceFile)
  return interfaces
}

function getPropertyName(name: ts.PropertyName, sourceFile: ts.SourceFile): string {
  if (ts.isIdentifier(name)) {
    return name.text
  }
  // Handle string literal property names like "0.0" or 'abc'
  if (ts.isStringLiteral(name)) {
    return name.text
  }
  // Handle numeric literal property names like 123
  if (ts.isNumericLiteral(name)) {
    return name.text
  }
  return name.getText(sourceFile)
}

function getTypeInfoWithoutResolving(typeNode: ts.TypeNode, sourceFile: ts.SourceFile, typeAliases?: Map<string, ts.TypeNode>): TypeInfo | null {
  // For type references, don't resolve - keep the name as 'unknown' kind
  if (ts.isTypeReferenceNode(typeNode)) {
    const typeName = typeNode.typeName.getText(sourceFile)
    // Return as unknown type to preserve the name for hint generation
    return { name: typeName, kind: 'unknown' }
  }

  // For other types, use normal resolution
  return getTypeInfo(typeNode, sourceFile, typeAliases)
}

function getTypeInfo(typeNode: ts.TypeNode | undefined, sourceFile: ts.SourceFile, typeAliases?: Map<string, ts.TypeNode>): TypeInfo | null {
  if (!typeNode) {
    return { name: 'unknown', kind: 'unknown' }
  }

  // Handle parenthesized types: (Type)
  if (ts.isParenthesizedTypeNode(typeNode)) {
    return getTypeInfo(typeNode.type, sourceFile, typeAliases)
  }

  // Handle array types
  if (ts.isArrayTypeNode(typeNode)) {
    const elementType = getTypeInfo(typeNode.elementType, sourceFile, typeAliases)
    return {
      name: 'array',
      kind: 'array',
      isArray: true,
      arrayElementType: elementType || undefined
    }
  }

  // Handle union types
  if (ts.isUnionTypeNode(typeNode)) {
    const types = typeNode.types.map(t => getTypeInfo(t, sourceFile, typeAliases)).filter(Boolean) as TypeInfo[]

    // Check if it's a literal union (enum-like)
    const allLiterals = types.every(t => t.kind === 'literal')
    if (allLiterals) {
      return {
        name: 'enum',
        kind: 'enum',
        enumValues: types.map(t => t.literalValue!)
      }
    }

    return {
      name: 'union',
      kind: 'union',
      unionTypes: types
    }
  }

  // Handle intersection types
  if (ts.isIntersectionTypeNode(typeNode)) {
    const types = typeNode.types.map(t => getTypeInfo(t, sourceFile, typeAliases)).filter(Boolean) as TypeInfo[]

    return {
      name: 'intersection',
      kind: 'intersection',
      intersectionTypes: types
    }
  }

  // Handle literal types
  if (ts.isLiteralTypeNode(typeNode)) {
    const literal = typeNode.literal
    let value: string | number | boolean

    if (ts.isStringLiteral(literal)) {
      value = literal.text
    } else if (ts.isNumericLiteral(literal)) {
      value = Number(literal.text)
    } else if (literal.kind === ts.SyntaxKind.TrueKeyword) {
      value = true
    } else if (literal.kind === ts.SyntaxKind.FalseKeyword) {
      value = false
    } else {
      value = literal.getText(sourceFile)
    }

    return {
      name: 'literal',
      kind: 'literal',
      literalValue: value
    }
  }

  // Handle template literal types
  if (ts.isTemplateLiteralTypeNode(typeNode)) {
    const pattern = typeNode.getText(sourceFile)
    return {
      name: 'template',
      kind: 'template',
      templatePattern: pattern
    }
  }

  // Handle tuple types: [Type1, Type2, ...]
  if (ts.isTupleTypeNode(typeNode)) {
    const elements = typeNode.elements.map(element => {
      // Handle named tuple elements: [name: Type]
      if (ts.isNamedTupleMember(element)) {
        const name = element.name.getText(sourceFile)
        const type = getTypeInfoWithoutResolving(element.type, sourceFile, typeAliases)
        return { type: type!, name }
      }
      // Handle regular tuple elements: [Type]
      const type = getTypeInfoWithoutResolving(element, sourceFile, typeAliases)
      return { type: type! }
    })

    return {
      name: 'tuple',
      kind: 'tuple',
      tupleElements: elements
    }
  }

  // Handle type references (custom types, Date, etc.)
  if (ts.isTypeReferenceNode(typeNode)) {
    const typeName = typeNode.typeName.getText(sourceFile)

    if (typeName === 'Date') {
      return { name: 'Date', kind: 'date' }
    }

    if (typeName === 'Array') {
      const typeArg = typeNode.typeArguments?.[0]
      const elementType = typeArg ? getTypeInfo(typeArg, sourceFile, typeAliases) : null
      return {
        name: 'array',
        kind: 'array',
        isArray: true,
        arrayElementType: elementType || undefined
      }
    }

    // Handle Map<K, V>
    if (typeName === 'Map') {
      // Don't resolve type arguments - keep type names for smart generation hints
      const keyTypeNode = typeNode.typeArguments?.[0]
      const valueTypeNode = typeNode.typeArguments?.[1]

      const keyType = keyTypeNode ? getTypeInfoWithoutResolving(keyTypeNode, sourceFile, typeAliases) : null
      const valueType = valueTypeNode ? getTypeInfoWithoutResolving(valueTypeNode, sourceFile, typeAliases) : null

      return {
        name: 'Map',
        kind: 'map',
        mapKeyType: keyType || undefined,
        mapValueType: valueType || undefined
      }
    }

    // Handle Set<T>
    if (typeName === 'Set') {
      const elementTypeNode = typeNode.typeArguments?.[0]
      const elementType = elementTypeNode ? getTypeInfoWithoutResolving(elementTypeNode, sourceFile, typeAliases) : null
      return {
        name: 'Set',
        kind: 'set',
        setElementType: elementType || undefined
      }
    }

    // Handle utility types: Partial, Required, Pick, Omit, Readonly, Lowercase, Uppercase, Capitalize, Uncapitalize
    if (utilityTypes.includes(typeName as UtilityType)) {
      // Don't resolve type arguments - keep type names for smart generation hints
      const typeArgs = typeNode.typeArguments?.map(arg => getTypeInfoWithoutResolving(arg, sourceFile, typeAliases)).filter(Boolean) as TypeInfo[] || []
      return {
        name: typeName,
        kind: 'utility',
        utilityType: typeName as UtilityType,
        utilityTypeArgs: typeArgs
      }
    }

    // Resolve type aliases
    if (typeAliases && typeAliases.has(typeName)) {
      const resolvedType = typeAliases.get(typeName)!
      return getTypeInfo(resolvedType, sourceFile, typeAliases)
    }

    return { name: typeName, kind: 'unknown' }
  }

  // Handle type literals (inline objects)
  if (ts.isTypeLiteralNode(typeNode)) {
    const properties: AnyObject<TypeInfo> = {}
    let _indexSignature: IndexSignature | null = null

    typeNode.members.forEach(member => {
      if (ts.isPropertySignature(member) && member.name) {
        const propName = getPropertyName(member.name, sourceFile)
        const isOptional = !!member.questionToken

        // Preserve type alias names as hints
        let typeHint: string | undefined
        if (member.type && ts.isTypeReferenceNode(member.type)) {
          typeHint = member.type.typeName.getText(sourceFile)
        }

        const typeInfo = getTypeInfo(member.type, sourceFile, typeAliases)

        if (typeInfo) {
          properties[propName] = {
            ...typeInfo,
            isOptional,
            typeHint: typeHint || typeInfo.typeHint
          }
        }
      }

      // Handle index signatures: { [key: any]: any }
      if (ts.isIndexSignatureDeclaration(member)) {
        const keyParam = member.parameters[0]
        const keyParamName = keyParam ? (ts.isIdentifier(keyParam.name) ? keyParam.name.text : undefined) : undefined
        const keyType = keyParam?.type ? getTypeInfoWithoutResolving(keyParam.type, sourceFile, typeAliases) : null
        const valueType = member.type ? getTypeInfoWithoutResolving(member.type, sourceFile, typeAliases) : null
        _indexSignature = { keyType, valueType, keyParamName }
      }
    })

    // If there's an index signature and no properties, treat it as a Record
    if (isIndexSignature(_indexSignature) && Object.keys(properties).length === 0) {
      const indexSignature = _indexSignature as IndexSignature
      const keyTypeArg: TypeInfo = indexSignature.keyType || { name: 'string', kind: 'string' }
      // Add keyHint if we have a parameter name
      if (indexSignature.keyParamName) {
        keyTypeArg.keyHint = indexSignature.keyParamName
      }

      return {
        name: 'Record',
        kind: 'utility',
        utilityType: 'Record',
        utilityTypeArgs: [
          keyTypeArg,
          indexSignature.valueType || { name: 'unknown', kind: 'unknown' }
        ]
      }
    }

    return {
      name: 'object',
      kind: 'object',
      objectProperties: properties
    }
  }

  const typeText = typeNode.getText(sourceFile).toLowerCase()

  // Handle primitive types
  switch (typeNode.kind) {
    case ts.SyntaxKind.StringKeyword:
      return { name: 'string', kind: 'string' }
    case ts.SyntaxKind.NumberKeyword:
      return { name: 'number', kind: 'number' }
    case ts.SyntaxKind.BooleanKeyword:
      return { name: 'boolean', kind: 'boolean' }
    case ts.SyntaxKind.AnyKeyword:
      return { name: 'any', kind: 'unknown' }
    default:
      return { name: typeText, kind: 'unknown' }
  }
}

const utilityTypes: UtilityType[] = ['Partial', 'Required', 'Pick', 'Omit', 'Readonly', 'Record', 'Lowercase', 'Uppercase', 'Capitalize', 'Uncapitalize', 'Promise', 'Awaited'] as const
const builtInTypes = ['Array', 'Set', 'Map', ...utilityTypes]

export function validateTypeScript(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  try {
    // Create a program with the source file and lib files
    const compilerOptions: ts.CompilerOptions = {
      target: ts.ScriptTarget.Latest,
      module: ts.ModuleKind.ESNext,
      lib: ['lib.esnext.d.ts'],
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      skipDefaultLibCheck: false
    }

    const fileName = 'temp.ts'
    const sourceFile = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true)

    // Create a host for the program
    const host: ts.CompilerHost = {
      getSourceFile: (name) => name === fileName ? sourceFile : undefined,
      writeFile: () => { },
      getCurrentDirectory: () => '',
      getDirectories: () => [],
      fileExists: (name) => name === fileName,
      readFile: (name) => name === fileName ? code : undefined,
      getCanonicalFileName: (name) => name,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      getDefaultLibFileName: (options) => ts.getDefaultLibFileName(options)
    }

    // Create the program
    const program = ts.createProgram([fileName], compilerOptions, host)

    // Get all diagnostics (syntax + semantic)
    const allDiagnostics = [
      ...program.getSyntacticDiagnostics(sourceFile),
      ...program.getSemanticDiagnostics(sourceFile)
    ]

    allDiagnostics.forEach((diagnostic) => {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')

      // Skip "too complex" errors for template literals - we can generate them anyway
      if (message.includes('too complex to represent')) {
        return
      }

      // Skip index signature parameter type errors - we handle them in generation
      if (message.includes('An index signature parameter type cannot be a literal type or generic type')) {
        return
      }

      // Skip errors about built-in types that aren't loaded (Array, Promise, etc.)
      if (builtInTypes.some(type => message.includes(`Cannot find name '${type}'`))) {
        return
      }

      if (diagnostic.file && diagnostic.start !== undefined) {
        const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
        errors.push(`Line ${line + 1}:${character + 1} - ${message}`)
      } else {
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
        errors.push(message)
      }
    })

    return {
      valid: errors.length === 0,
      errors
    }
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : 'Unknown parsing error']
    }
  }
}
