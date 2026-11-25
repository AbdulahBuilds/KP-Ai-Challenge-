import './globals.css';

export const metadata = {
  title: 'BHU Clinical Referral Portal | KP Healthcare Network',
  description: 'AI-Powered Provincial Triage, Emergency Dispatch & Hospital Referral System — Khyber Pakhtunkhwa (KPK)',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}

