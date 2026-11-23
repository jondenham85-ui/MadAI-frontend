import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import PartnerApplicationForm from '@/components/developers/PartnerApplicationForm';
import '../developers.css';

export const metadata: Metadata = {
  title: 'Apply for MADSI Developer Access',
  description: 'Submit your application to integrate Sign in with MADSI.',
};

export default function DeveloperApplyPage() {
  return <><Header /><main className="mad-main dev-page">
    <div className="dev-status"><span><i /> MADSI DEVELOPER PLATFORM</span><span>PARTNER APPLICATION</span></div>
    <section className="dev-section">
      <div className="dev-section-heading"><p className="dev-eyebrow">PARTNER ONBOARDING</p><h2>Apply to connect with MADSI.</h2><p>Tell us about your application, callback URLs and requested permissions. You must be signed in to MADSI to submit.</p></div>
      <PartnerApplicationForm />
    </section>
    <footer className="dev-footer"><a href="/developers">← Developer platform</a><span>Applications are reviewed before OAuth clients are created.</span></footer>
  </main></>;
}
