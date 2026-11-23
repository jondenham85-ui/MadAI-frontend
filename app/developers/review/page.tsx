import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import OAuthApplicationReview from '@/components/developers/OAuthApplicationReview';
import '../developers.css';

export const metadata: Metadata = { title: 'MADSI OAuth Partner Review' };

export default function DeveloperReviewPage() {
  return <><Header /><main className="mad-main dev-page">
    <div className="dev-status"><span><i /> MADSI OWNER CONSOLE</span><span>PARTNER REVIEW QUEUE</span></div>
    <section className="dev-section"><div className="dev-section-heading"><p className="dev-eyebrow">RESTRICTED ACCESS</p><h2>OAuth partner applications.</h2><p>Review the developer, verify ownership of the website and callback domains, inspect privacy and security practices, and document the decision.</p></div><OAuthApplicationReview /></section>
    <footer className="dev-footer"><a href="/developers">← Developer platform</a><span>Approval does not automatically create OAuth credentials.</span></footer>
  </main></>;
}
