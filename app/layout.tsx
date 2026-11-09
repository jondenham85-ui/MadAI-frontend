import type {Metadata,Viewport} from 'next';
import type {ReactNode} from 'react';
import './globals.css';
import './design.css';
import {UserProvider} from '@/context/UserContext';
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#070b12'};
export const metadata:Metadata={metadataBase:new URL('https://madmadisonai.com'),title:{default:'MAD SI',template:'%s | MAD SI'},description:'Your ideas. A clearer next step. Chat, save directives and generate source code with MAD SI.',openGraph:{title:'MAD SI',description:'Your AI workspace.',url:'https://madmadisonai.com',siteName:'MAD SI',type:'website'}};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="en"><body><UserProvider>{children}</UserProvider></body></html>;}
