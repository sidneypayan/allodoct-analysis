import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Allodoct Analysis',
  description: 'Analyse des appels Allodoct et identification des problèmes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
