import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'Hospital Portal – AI-Powered Healthcare Coordination System',
  description: 'Hospital resource management, incoming BHU referrals, and Rescue 1122 emergency alerts for KPK.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-surface-main text-typography-primary font-sans antialiased selection:bg-brand-primary selection:text-white">
        {children}
      </body>
    </html>
  );
}
