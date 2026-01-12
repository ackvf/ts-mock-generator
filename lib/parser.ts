import * as ts from 'typescript'
import type { InterfaceInfo, TypeInfo } from './types'

export function parseTypeScriptInterface(code: string): InterfaceInfo[] {
  const sourceFile = ts.createSourceFile(
    'temp.ts',
    code,
    ts.ScriptTarget.Latest,
    true
  )

  const interfaces: InterfaceInfo[] = []

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
          const typeInfo = getTypeInfo(member.type, sourceFile)

          if (typeInfo) {
            interfaceInfo.properties[propertyName] = {
              ...typeInfo,
              isOptional
            }
          }
        }
      })

      interfaces.push(interfaceInfo)
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return interfaces
}

function getPropertyName(name: ts.PropertyName, sourceFile: ts.SourceFile): string {
  if (ts.isIdentifier(name)) {
    return name.text
  }
  if (ts.isStringLiteral(name)) {
    return name.text
  }
  if (ts.isNumericLiteral(name)) {
    return name.text
  }
  return name.getText(sourceFile)
}

function getTypeInfo(typeNode: ts.TypeNode | undefined, sourceFile: ts.SourceFile): TypeInfo | null {
  if (!typeNode) {
    return { name: 'unknown', kind: 'unknown' }
  }

  // Handle array types
  if (ts.isArrayTypeNode(typeNode)) {
    const elementType = getTypeInfo(typeNode.elementType, sourceFile)
    return {
      name: 'array',
      kind: 'array',
      isArray: true,
      arrayElementType: elementType || undefined
    }
  }

  // Handle union types
  if (ts.isUnionTypeNode(typeNode)) {
    const types = typeNode.types.map(t => getTypeInfo(t, sourceFile)).filter(Boolean) as TypeInfo[]

    // Check if it's a literal union (enum-like)
    const allLiterals = types.every(t => t.kind === 'literal')
    if (allLiterals) {
      return {
        name: 'enum',
        kind: 'enum',
        enumValues: types.map(t => String(t.literalValue))
      }
    }

    return {
      name: 'union',
      kind: 'union',
      unionTypes: types
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

  // Handle type references (custom types, Date, etc.)
  if (ts.isTypeReferenceNode(typeNode)) {
    const typeName = typeNode.typeName.getText(sourceFile)

    if (typeName === 'Date') {
      return { name: 'Date', kind: 'date' }
    }

    if (typeName === 'Array') {
      const typeArg = typeNode.typeArguments?.[0]
      const elementType = typeArg ? getTypeInfo(typeArg, sourceFile) : null
      return {
        name: 'array',
        kind: 'array',
        isArray: true,
        arrayElementType: elementType || undefined
      }
    }

    return { name: typeName, kind: 'unknown' }
  }

  // Handle type literals (inline objects)
  if (ts.isTypeLiteralNode(typeNode)) {
    const properties: Record<string, TypeInfo> = {}

    typeNode.members.forEach(member => {
      if (ts.isPropertySignature(member) && member.name) {
        const propName = getPropertyName(member.name, sourceFile)
        const isOptional = !!member.questionToken
        const typeInfo = getTypeInfo(member.type, sourceFile)

        if (typeInfo) {
          properties[propName] = {
            ...typeInfo,
            isOptional
          }
        }
      }
    })

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

export function validateTypeScript(code: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  try {
    const sourceFile = ts.createSourceFile(
      'temp.ts',
      code,
      ts.ScriptTarget.Latest,
      true
    )

    const diagnostics = (sourceFile as { parseDiagnostics?: ts.Diagnostic[] }).parseDiagnostics || []

    diagnostics.forEach((diagnostic: ts.Diagnostic) => {
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
      errors.push(message)
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
