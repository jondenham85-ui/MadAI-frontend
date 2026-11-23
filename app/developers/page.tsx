import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import './developers.css';

export const metadata: Metadata = {
  title: 'Developer Platform',
  description: 'Build applications that let people securely sign in with MADSI using OAuth 2.1.',
};

const scopes = [
  ['openid', 'OpenID Connect identity (requires asymmetric JWT signing keys to be configured)'],
  ['profile', 'Basic profile information'],
  ['email', 'Email address'],
];

export default function DevelopersPage() {
  return (
    <>
      <Header />
      <main className="mad-main dev-page">
        <div className="dev-status"><span><i /> MADSI DEVELOPER PLATFORM</span><span>OAUTH 2.1 · PARTNER PREVIEW</span></div>
        <section className="dev-hero">
          <div>
            <p className="dev-eyebrow">ONE IDENTITY. MANY EXPERIENCES.</p>
            <h1>Build with <span>MADSI.</span></h1>
            <p className="dev-lede">Give people a simple, secure way to sign in to your application with their MADSI account. Your app requests only the permissions it needs. The user stays in control.</p>
            <div className="dev-actions"><a className="dev-primary" href="#dev-start">Explore integration <b>↓</b></a><a className="dev-secondary" href="https://supabase.com/docs/guides/auth/oauth-server/getting-started" target="_blank" rel="noreferrer">OAuth 2.1 technical guide ↗</a></div>
          </div>
          <div className="dev-orbit" aria-hidden="true"><div className="dev-orbit-ring dev-ring-a" /><div className="dev-orbit-ring dev-ring-b" /><div className="dev-orbit-core"><strong>M</strong><small>MADSI ID</small></div><span className="dev-node dev-node-a">YOUR APP</span><span className="dev-node dev-node-b">USER</span></div>
        </section>

        <section className="dev-principles">
          <article><span>01</span><h2>User consent first</h2><p>People see the application name, redirect address and requested permissions before they approve access.</p></article>
          <article><span>02</span><h2>Least privilege</h2><p>Request only the scopes your product genuinely needs. Never ask for broad access by default.</p></article>
          <article><span>03</span><h2>Secure credentials</h2><p>Client secrets stay on your server. Public apps use the public-client flow and PKCE.</p></article>
        </section>

        <section id="dev-start" className="dev-section">
          <div className="dev-section-heading"><p className="dev-eyebrow">INTEGRATION OVERVIEW</p><h2>Connect your application.</h2><p>OAuth 2.1 authorization code flow with PKCE is the recommended starting point.</p></div>
          <div className="dev-steps">
            <article><b>01</b><div><h3>Request partner review</h3><p>Prepare your app name, company or developer identity, public homepage, privacy policy, support contact and exact callback URL.</p></div></article>
            <article><b>02</b><div><h3>Register your OAuth client</h3><p>After review, MADSI registers your app with its exact redirect URI and the correct client type. No wildcard callbacks are accepted.</p></div></article>
            <article><b>03</b><div><h3>Implement sign-in</h3><p>Use the authorization code flow with PKCE, validate state, and exchange codes only through the correct token endpoint.</p></div></article>
            <article><b>04</b><div><h3>Respect user choice</h3><p>Show clear sign-in and sign-out behavior, request minimum scopes, protect tokens, and handle denied or revoked access gracefully.</p></div></article>
          </div>
        </section>

        <section className="dev-technical">
          <div><p className="dev-eyebrow">IDENTITY PROVIDER ENDPOINTS</p><h2>OAuth connection details</h2><p className="dev-muted">These endpoints are served by the MADSI authentication provider. Use the provider's discovery metadata in your implementation rather than hard-coding assumptions.</p></div>
          <div className="dev-endpoints">
            <div><span>Authorization</span><code>https://rcetiocftggebqzfuncd.supabase.co/auth/v1/oauth/authorize</code></div>
            <div><span>Token</span><code>https://rcetiocftggebqzfuncd.supabase.co/auth/v1/oauth/token</code></div>
            <div><span>OpenID configuration</span><code>https://rcetiocftggebqzfuncd.supabase.co/auth/v1/.well-known/openid-configuration</code></div>
            <div><span>JWKS</span><code>https://rcetiocftggebqzfuncd.supabase.co/auth/v1/.well-known/jwks.json</code></div>
          </div>
          <p className="dev-note">The user-facing consent page is hosted at <strong>https://www.madmadisonai.com/oauth/consent</strong>.</p>
        </section>

        <section className="dev-scope-section">
          <div><p className="dev-eyebrow">AVAILABLE BASE SCOPES</p><h2>Ask only for what you need.</h2><p className="dev-muted">Users will see the permissions requested by your app on the MADSI consent screen.</p></div>
          <div className="dev-scope-list">{scopes.map(([scope, description]) => <div key={scope}><code>{scope}</code><span>{description}</span></div>)}</div>
        </section>

        <section className="dev-apply">
          <div><p className="dev-eyebrow">PARTNER ONBOARDING</p><h2>Ready to integrate?</h2><p>Submit your application for a security and redirect-URI review. You must be signed in to MADSI. Approved applications are manually registered during the partner preview.</p><a className="dev-primary" href="/developers/apply">Apply for developer access →</a></div>
          <div className="dev-apply-checklist"><strong>Have these details ready:</strong><ul><li>Application and organization name</li><li>Public website and privacy policy</li><li>Exact HTTPS callback URL(s)</li><li>Public or confidential client type</li><li>Scopes and a short explanation of why they are needed</li><li>Technical and security contact</li></ul><p>No client IDs or secrets are issued by this information page. Never send a client secret in a public form, chat or email.</p></div>
        </section>
        <footer className="dev-footer"><a href="/">← Back to MADSI</a><span>Secure identity starts with user choice.</span><a href="https://supabase.com/docs/guides/auth/oauth-server/getting-started" target="_blank" rel="noreferrer">Supabase OAuth documentation ↗</a></footer>
      </main>
    </>
  );
}
