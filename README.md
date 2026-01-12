# TypeScript Mock Generator

A powerful web application that generates realistic mock data from TypeScript interfaces. Perfect for testing, prototyping, and seeding databases.

## ✨ Features

- **TypeScript Interface Parsing** — Automatically parse TypeScript interfaces and type definitions
- **Smart Field Detection** — Intelligently generates data based on field names (email, phone, address, etc.)
- **Example Data Analysis** — Optionally provide existing data to make generated mocks more realistic
- **OpenAI Enhancement** — AI-powered suggestions for better data boundaries and patterns
- **Multiple Formats** — Support for primitives, arrays, nested objects, enums, unions, and literal types
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

1. **Enter TypeScript Interface** — Paste your TypeScript interface in the left panel
2. **Set Options** — Choose how many records to generate
3. **Generate** — Click "Generate Mock Data" to create realistic mock data
4. **Copy** — Use the copy button to copy the JSON output

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

### Using Example Data (Optional)

Provide existing JSON examples to improve realism:

```json
[
  { "name": "John Doe", "age": 30, "role": "admin" },
  { "name": "Jane Smith", "age": 25, "role": "user" }
]
```

The generator will analyze patterns and occasionally use similar values.

### AI Enhancement (Optional)

Enable OpenAI integration for intelligent suggestions:

1. Check "Use OpenAI Enhancement"
2. Enter your OpenAI API key
3. The AI will suggest realistic constraints based on field names and context

## 🛠️ Technology Stack

- **Next.js 16** — React framework with App Router
- **TypeScript 5** — Type parsing and validation
- **Faker.js** — Mock data generation
- **Tailwind CSS 4** — Styling
- **shadcn/ui** — UI components
- **React Syntax Highlighter** — Code display

## 📁 Project Structure

```
├── app/
│   ├── api/enhance/     # OpenAI integration API route
│   ├── page.tsx         # Main generator UI
│   └── layout.tsx       # App layout
├── components/
│   ├── ui/              # UI components (shadcn)
│   └── code-display.tsx # Syntax highlighted code viewer
├── lib/
│   ├── parser.ts        # TypeScript interface parser
│   ├── generator.ts     # Mock data generation engine
│   ├── analyzer.ts      # Example data analyzer
│   └── types.ts         # Shared type definitions
```

## 🎯 Supported Types

- **Primitives**: string, number, boolean, Date
- **Arrays**: T[]
- **Objects**: Nested interfaces and inline types
- **Enums**: Literal unions ('a' | 'b' | 'c')
- **Unions**: Multiple type options
- **Literal Types**: Specific values
- **Optional Properties**: property?

## 🧠 Smart Field Detection

The generator recognizes common field names and generates appropriate data:

- `email` → Valid email addresses
- `phone` → Phone numbers
- `url`, `website` → URLs
- `name`, `firstName`, `lastName` → Person names
- `address`, `street`, `city`, `country` → Location data
- `age` → Numbers between 18-80
- `price`, `amount` → Currency values
- `company` → Company names
- And many more...

## 🔧 API Routes

### POST /api/enhance

Enhances type definitions with AI-powered suggestions.

**Request:**
```json
{
  "interface": "interface User { ... }",
  "apiKey": "sk-..."
}
```

**Response:**
```json
{
  "enhancements": [
    {
      "fieldName": "age",
      "suggestions": {
        "min": 18,
        "max": 100,
        "description": "Adult age range"
      }
    }
  ]
}
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Feel free to open issues or submit pull requests.
