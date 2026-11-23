'use client';

import { useEffect, useState } from 'react';
import { getOAuthSupabaseClient } from '@/lib/supabase/oauth-client';
import './oauth-consent.css';

type ConsentProps = { authorizationId: string };

export default function OAuthConsent({ authorizationId }: ConsentProps) {
  const [clientName, setClientName] = useState('');
  const [redirectUri, setRedirectUri] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!authorizationId) {
        setError('This authorization link is missing its request ID. Return to the application and try again.');
        setLoading(false);
        return;
      }
      try {
        const supabase = getOAuthSupabaseClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) {
          const next = window.location.pathname + window.location.search;
          window.location.replace('/login?next=' + encodeURIComponent(next));
          return;
        }

        const { data, error: detailsError } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
        if (detailsError) throw detailsError;
        if (!data) throw new Error('No authorization request was returned.');

        if (!('authorization_id' in data)) {
          window.location.replace(data.redirect_url);
          return;
        }

        if (active) {
          setClientName(data.client?.name || 'An application');
          setRedirectUri(data.redirect_uri || '');
          setScopes((data.scope || '').split(/\\s+/).filter(Boolean));
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load this authorization request.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(decision: 'approve' | 'deny') {
    setBusy(true);
    setError('');
    try {
      const supabase = getOAuthSupabaseClient();
      const result = decision === 'approve'
        ? await supabase.auth.oauth.approveAuthorization(authorizationId)
        : await supabase.auth.oauth.denyAuthorization(authorizationId);
      if (result.error) throw result.error;
      window.location.assign(result.data.redirect_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Your decision could not be submitted. Please try again.');
      setBusy(false);
    }
  }

  return (
    <main className="oauth-consent-shell">
      <section className="oauth-consent-card" aria-labelledby="oauth-consent-title">
        <p className="oauth-consent-eyebrow">MADSI · ACCOUNT SECURITY</p>
        <h1 id="oauth-consent-title">Connect an application?</h1>
        {loading ? <p className="oauth-consent-muted">Checking the authorization request…</p> : (
          <>
            {error && <p className="oauth-consent-error" role="alert">{error}</p>}
            {!error && <>
              <p className="oauth-consent-muted"><strong>{clientName}</strong> is requesting permission to access your MADSI account.</p>
              <div className="oauth-consent-detail">
                <span className="oauth-consent-label">Application</span>
                <strong>{clientName}</strong>
                {redirectUri && <><span className="oauth-consent-label">Redirect address</span><span className="oauth-consent-uri">{redirectUri}</span></>}
                <span className="oauth-consent-label">Requested permissions</span>
                {scopes.length ? <ul>{scopes.map(scope => <li key={scope}>{scope}</li>)}</ul> : <p className="oauth-consent-muted">No specific scopes were listed.</p>}
              </div>
              <p className="oauth-consent-warning">Only approve applications you recognize and trust. You can revoke an application's access later from your connected-app settings.</p>
              <div className="oauth-consent-actions">
                <button type="button" disabled={busy} onClick={() => void decide('deny')} className="oauth-consent-deny">{busy ? 'Please wait…' : 'Deny'}</button>
                <button type="button" disabled={busy} onClick={() => void decide('approve')} className="oauth-consent-approve">{busy ? 'Please wait…' : 'Approve access'}</button>
              </div>
            </>}
          </>
        )}
        <a className="oauth-consent-back" href="/settings">Back to MADSI</a>
      </section>
    </main>
  );
}
