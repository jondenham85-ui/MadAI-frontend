import type {Metadata,Viewport} from 'next';
import type {ReactNode} from 'react';
import './globals.css';
import './design.css';
import './nexus.css';
import {UserProvider} from '@/context/UserContext';
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#031b1e'};
export const metadata:Metadata={
 metadataBase:new URL('https://www.madmadisonai.com'),
 title:{default:'MADSI — AI Workspace for Chat, Tasks & Creation',template:'%s | MADSI'},
 description:'Meet MADSI, your connected AI workspace for intelligent conversations, task workflows, and creating websites, code, and projects. Start free.',
 applicationName:'MADSI',
 keywords:['AI workspace','AI assistant','AI task automation','AI website builder','AI coding assistant','MAD Synthetic Intelligence'],
 alternates:{canonical:'/'},
 openGraph:{title:'MADSI — Think, Build, Move Forward',description:'One connected AI workspace for intelligent chat, task workflows, and creation. Start free with MADSI.',url:'https://www.madmadisonai.com/',siteName:'MADSI',type:'website'},
 twitter:{card:'summary_large_image',title:'MADSI — Think, Build, Move Forward',description:'One connected AI workspace for intelligent chat, task workflows, and creation. Start free.'},
 robots:{index:true,follow:true,googleBot:{index:true,follow:true,'max-image-preview':'large','max-snippet':-1,'max-video-preview':-1}}
};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="en"><body><UserProvider>{children}</UserProvider></body></html>;}
