import "./globals.css";

export const metadata = {
  title: "Finanças Pro",
  description: "Assistente Financeiro Murilo",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body>{children}</body>
    </html>
  );
}
