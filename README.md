# TypeScript Mock Generator

A powerful web application that generates realistic mock data from TypeScript interfaces. Perfect for testing, prototyping, and seeding databases with reproducible results.

## ✨ Features

- **TypeScript Interface Parsing** — Parse complex TypeScript interfaces, type aliases, and advanced types
- **Smart Field Detection** — Intelligently generates data based on field names (email, phone, address, etc.)
- **Template Literal Types** — Full support for TypeScript template literals like `` `${First}-${Last}` ``
- **Utility Types** — Partial, Required, Pick, Omit, Readonly, Record, Lowercase, Uppercase, Capitalize, Uncapitalize
- **Collection Types** — Map, Set, Array with smart generation
- **Intersection & Union Types** — Combine types with `&` and `|` operators
- **Tuples** — Regular and named tuples: `[string, number]` or `[name: string, age: number]`
- **Seed Management** — Reproducible results with seed history (last 3 seeds tracked)
- **Auto-Generation** — Real-time mock data generation as you type
- **JSON to Interface** — Convert example JSON to TypeScript interfaces automatically
- **Syntax Highlighting** — Beautiful code display with copy-to-clipboard functionality

## 🚀 Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Run the development server:
```bash
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📖 Usage

### Basic Usage

1. **Choose Input Mode** — Start with TypeScript Interface or Example JSON
2. **Enter Your Types** — Paste your TypeScript interface or example JSON data
3. **Configure Options** — Set number of records and optional seed for reproducibility
4. **Generate** — Mock data auto-generates as you type, or click the button manually
5. **Copy** — Use the copy button to copy the JSON output

### Example Interface

```typescript
interface User {
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
}
```

### Advanced Type Examples

**Template Literals:**
```typescript
interface Product {
  sku: `${Category}-${number}-${Size}`
}
type Category = 'ELEC' | 'FURN' | 'CLTH'
type Size = 'SM' | 'MD' | 'LG'
// Generates: "ELEC-742-MD"
```

**Intersection Types:**
```typescript
interface Person {
  user: { name: string } & { age: number }
  // Generates: { name: "John", age: 30 }
}
```

**Utility Types:**
```typescript
interface Config {
  partial: Partial<User>
  readonly: Readonly<User>
  names: Lowercase<string>
  map: Record<string, number>
}
```

**Tuples:**
```typescript
interface Data {
  point: [number, number]
  named: [x: number, y: number, label: string]
}
```

### Seed Management

- Leave seed empty for random generation
- Click recent seeds to reproduce exact results
- Last 3 seeds are tracked and clickable
- Use same seed to get identical mock data

## 🛠️ Technology Stack

- **Next.js 16** — React framework with App Router
- **Tailwind CSS 4** — Styling
- **Shadcn/ui + Base UI** — UI components
- **TypeScript 5** — Type parsing and validation with TypeScript Compiler API
- **Faker.js** — Mock data generation with seeded randomness
- **React Syntax Highlighter** — Code display

## 📁 Project Structure

```
├── app/
│   ├── page.tsx         # Main generator UI
│   ├── layout.tsx       # App layout
│   └── globals.css      # Global styles
├── components/
│   ├── ui/              # UI components (shadcn)
│   └── ...              # Custom components
├── lib/
│   ├── parser.ts        # TypeScript interface parser
│   ├── generator.ts     # Mock data generation engine
│   ├── json-to-interface.ts # JSON to TypeScript converter
│   └── types.ts         # Shared type definitions
```

## 🎯 Supported Types

### Primitives
- `string`, `number`, `boolean`, `Date`

### Complex Types
- **Arrays**: `T[]`, `Array<T>`
- **Objects**: Nested interfaces and inline types
- **Enums**: Literal unions `'a' | 'b' | 'c'`
- **Unions**: Multiple type options `string | number`
- **Intersections**: Type combinations `Type1 & Type2`
- **Literal Types**: Specific values `42`, `'hello'`
- **Optional Properties**: `property?`
- **Tuples**: `[string, number]`, `[name: string, age: number]`
- **Parenthesized**: `('admin' | 'user')[]`

### Template Literals
- Pattern matching: `` `${Type1}-${Type2}` ``
- Placeholders: `${string}`, `${number}`, `${boolean}`
- Custom type substitution: `${CustomType}`

### Utility Types
- **Transformation**: `Partial<T>`, `Required<T>`, `Readonly<T>`, `Pick<T, K>`, `Omit<T, K>`
- **String Manipulation**: `Lowercase<T>`, `Uppercase<T>`, `Capitalize<T>`, `Uncapitalize<T>`
- **Async**: `Promise<T>`, `Awaited<T>`
- **Collections**: `Record<K, V>`

### Collection Types
- `Map<K, V>` — Generates key-value objects
- `Set<T>` — Generates arrays of unique values
- `Array<T>` — Standard array type
- Index signatures: `{ [key: string]: Type }`

## 🧠 Smart Field Detection

The generator recognizes common field names and generates appropriate data:

**Personal Information:**
- `name`, `firstName`, `first`, `lastName`, `last` → Person names
- `email` → Valid email addresses
- `username` → Usernames
- `password` → Secure passwords
- `phone` → Phone numbers
- `avatar`, `image` → Image URLs
- `age` → Numbers between 18-80

**Location:**
- `address` → Full addresses
- `street` → Street names
- `city` → City names
- `state`, `province` → State/province names
- `country` → Country names
- `zipcode`, `zip`, `postal` → Postal codes
- `latitude`, `longitude` → Coordinates

**Business:**
- `company`, `organization`, `org` → Company names
- `job`, `title`, `position` → Job titles
- `department` → Department names

**Web & Tech:**
- `url`, `website` → URLs
- `uuid`, `id` → UUIDs
- `color` → Color hex codes

**Commerce:**
- `price`, `amount`, `cost` → Currency values
- `currency` → Currency codes
- `product` → Product names

**Numbers:**
- `year`, `month`, `day` → Date components
- `hour`, `minute`, `second` → Time components
- `quantity`, `count` → Positive integers
- `percent`, `rate`, `rating` → Percentages

**Text:**
- `description`, `bio`, `text`, `content` → Lorem ipsum text

### Type Alias Hints

Use semantic type alias names for better generation:

```typescript
type First = string  // Generates first names
type Age = number    // Generates realistic ages
type Email = string  // Generates email addresses

interface Person {
  name: First        // Uses "First" hint → "Jane"
  age: Age          // Uses "Age" hint → 28
  contact: Email    // Uses "Email" hint → "jane@example.com"
}
```

## 🎯 Special Features

### Reproducible Results
- Set a seed for deterministic generation
- Same seed always produces identical data
- Great for testing and demos

### Auto-Generation
- Mock data updates automatically as you type
- Manual generation shows validation errors
- Auto-generation suppresses errors for smooth editing

### Error Tolerance
The generator handles TypeScript patterns that technically violate rules:
- Index signatures with type aliases: `{ [key: First]: Age }`
- Complex template literals (excessively deep types)
- These work fine for generation despite TypeScript warnings

### Explore Capabilities
Click "🚀 Explore Capabilities" to load a comprehensive example showcasing all supported features including template literals, utility types, tuples, and more.

## � License

MIT

## 🤝 Contributing

Contributions welcome! Feel free to open issues or submit pull requests.

---

**Vibecoded** with Copilot & 🧡 using Next.js, TypeScript, Faker.js, Tailwind and Shadcn
