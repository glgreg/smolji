import './globals.css'

export const metadata = {
  title: 'Smolji - Customize & Convert Emojis to PNG Image Stickers',
  description: 'Convert and compose emojis into high-resolution transparent PNG stickers.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-zinc-50 dark:bg-zinc-950 font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
