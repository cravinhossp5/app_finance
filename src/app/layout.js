import './globals.css'

export const viewport = {
  themeColor: '#10b981', // A cor verde esmeralda no topo do celular
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Bloqueia o zoom de pinça, dando sensação de app nativo
};

export const metadata = {
  title: 'AppFinance Pro',
  description: 'Gestão Ativa de Patrimônio',
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
      <body className="bg-slate-950 text-slate-50 antialiased selection:bg-emerald-500/30">
        {children}
      </body>
    </html>
  )
}
