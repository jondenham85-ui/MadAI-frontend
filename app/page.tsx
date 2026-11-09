import Header from '@/components/layout/Header';
import SynthConsole from '@/components/synth/SynthConsole';
export default function HomePage() { return <><Header /><main className="mad-main"><section className="mad-hero"><p className="mad-eyebrow">MAD AI · Powered by MADSI</p><h1>Your AI workspace</h1><p>Start with 20 free chats and 3 tasks per day. Upgrade for higher limits and Premium source-code generation.</p><a href="/pricing">View plans</a></section><SynthConsole /></main></>; }
