import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Personal Document Storage & Reader',
  description: 'Secure in-memory personal document storage and native in-browser reader for PDF, TXT, CSV, HTML, and Images.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-950 text-slate-100 min-h-screen antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
