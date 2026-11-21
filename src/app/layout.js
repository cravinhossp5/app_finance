import './globals.css'

export const viewport = {
  themeColor: '#090a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata = {
  title: 'AppFinance Banking',
  description: 'Private Banking & Gestão de Patrimônio',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AppFinance',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#090a0f] text-zinc-100 antialiased selection:bg-emerald-500/20">
        {children}
      </body>
    </html>
  )
}
