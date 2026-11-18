import type {Metadata,Viewport} from 'next';
import type {ReactNode} from 'react';
import './globals.css';
import './design.css';
import {UserProvider} from '@/context/UserContext';
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#031b1e'};
export const metadata:Metadata={metadataBase:new URL('https://madmadisonai.com'),title:{default:'MADSI',template:'%s | MADSI'},description:'MADSI — MAD Synthetic Intelligence. A connected environment for conversation, directives and creation.',openGraph:{title:'MADSI',description:'MAD Synthetic Intelligence. Intelligence in motion.',url:'https://madmadisonai.com',siteName:'MADSI',type:'website'}};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="en"><body><UserProvider>{children}</UserProvider></body></html>;}
