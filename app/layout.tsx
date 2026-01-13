import type { Metadata } from "next"
import { Fira_Code, Geist, JetBrains_Mono } from "next/font/google"
import { ThemeProvider } from 'next-themes'

import "./globals.css"

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
})

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Generate TypeScript Interfaces and Mocks",
  description: "by qwerty.xyz",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="en">
      <body
        className={`${jetbrainsMono.variable} ${geistSans.variable} ${geistMono.variable} font-default antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
