import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Data Coffee — Model Hub',
  description: 'Enterprise multi-model AI workspace platform. Chat with Claude, GPT, and Gemini in one unified interface.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full bg-hub-bg text-hub-text antialiased selection:bg-hub-accent selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
