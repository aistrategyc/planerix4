import '@/styles/globals.css';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Planerix — Operating system for modern business',
  description: 'OKR, projects, CRM, finance and AI analytics in one platform.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="pt-24">{children}</main>
        <Footer />
      </body>
    </html>
  );
}