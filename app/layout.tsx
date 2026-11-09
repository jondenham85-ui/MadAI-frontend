import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { UserProvider } from '@/context/UserContext';
export const metadata: Metadata = { metadataBase: new URL('https://madmadisonai.com'), title: { default: 'MAD AI', template: '%s | MAD AI' }, description: 'MAD AI, powered by MADSI: AI chat, saved tasks, and source-code generation.', openGraph: { title: 'MAD AI', description: 'Your AI workspace, powered by MADSI.', url: 'https://madmadisonai.com', siteName: 'MAD AI', type: 'website' } };
export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="en"><body><UserProvider>{children}</UserProvider></body></html>; }
