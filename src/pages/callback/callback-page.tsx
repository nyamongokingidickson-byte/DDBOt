/* ============================================================
   PATCHED for Deriv NEW API — handles ?code=&state= (PKCE).
   Replaces the legacy <Callback> (acct1/token1) from
   @deriv-com/auth-client entirely.
   Flow: verify state → exchange code for Bearer token (CORS-
   enabled) → fetch Options accounts via REST → store session →
   return to the app.
   ============================================================ */
import { useEffect, useState } from 'react';
import ChunkLoader from '@/components/loader/chunk-loader';
import { APP_ID, getRedirectUri, OAUTH_CLIENT_ID, REST_BASE, TOKEN_URL } from '@/components/shared/utils/config/config';
import { clearAuthData } from '@/utils/auth-utils';
import { localize } from '@deriv-com/translations';
import { Button } from '@deriv-com/ui';

type TV2Account = {
    account_id: string;
    balance: number;
    currency: string;
    account_type: 'demo' | 'real';
    status: string;
};

const exchangeCodeForToken = async (code: string): Promise<{ access_token: string; expires_in: number }> => {
    const code_verifier = sessionStorage.getItem('pkce_code_verifier') ?? '';
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: OAUTH_CLIENT_ID,
        code,
        code_verifier,
        redirect_uri: getRedirectUri(),
    });
    const response = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.access_token) {
        throw new Error(json.error_description || json.error || `Token exchange failed (HTTP ${response.status})`);
    }
    return json;
};

const fetchAccounts = async (access_token: string): Promise<TV2Account[]> => {
    const response = await fetch(`${REST_BASE}/trading/v1/options/accounts`, {
        headers: {
            Authorization: `Bearer ${access_token}`,
            'Deriv-App-ID': APP_ID,
        },
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(json?.errors?.[0]?.message || `Could not fetch accounts (HTTP ${response.status})`);
    }
    return (json.data ?? []) as TV2Account[];
};

const CallbackPage = () => {
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const params = new URLSearchParams(window.location.search);

            /* OAuth error from Deriv (e.g. user cancelled) */
            if (params.get('error')) {
                setError(params.get('error_description') || params.get('error') || 'Login failed');
                return;
            }

            const code = params.get('code');
            const state = params.get('state');
            if (!code) {
                setError(localize('No authorization code received. Please try logging in again.'));
                return;
            }

            /* CSRF protection */
            const expected_state = sessionStorage.getItem('oauth_state');
            if (expected_state && state !== expected_state) {
                setError(localize('Security check failed (state mismatch). Please try logging in again.'));
                return;
            }

            try {
                /* 1. Code → Bearer token */
                const { access_token, expires_in } = await exchangeCodeForToken(code);
                sessionStorage.setItem('deriv_v2_token', access_token);
                sessionStorage.setItem('deriv_v2_token_exp', String(Date.now() + (expires_in || 3600) * 1000));
                /* authToken key kept for legacy readers across the repo */
                localStorage.setItem('authToken', access_token);

                /* 2. Load the user's Options accounts (demo + real) */
                const accounts = await fetchAccounts(access_token);
                if (!accounts.length) {
                    throw new Error(localize('No Options trading accounts found on this Deriv profile.'));
                }

                /* 3. Persist in both new and legacy shapes */
                const accountsList: Record<string, string> = {};
                const clientAccounts: Record<
                    string,
                    { loginid: string; token: string; currency: string; is_virtual: number; balance: number }
                > = {};
                accounts.forEach(acct => {
                    accountsList[acct.account_id] = access_token; // single bearer token in v2
                    clientAccounts[acct.account_id] = {
                        loginid: acct.account_id,
                        token: access_token,
                        currency: acct.currency || 'USD',
                        is_virtual: acct.account_type === 'demo' ? 1 : 0,
                        balance: acct.balance ?? 0,
                    };
                });
                localStorage.setItem('accountsList', JSON.stringify(accountsList));
                localStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));
                localStorage.setItem('v2_accounts', JSON.stringify(accounts));

                /* default to DEMO for safety, like deriv.com */
                const preferred = accounts.find(a => a.account_type === 'demo') ?? accounts[0];
                localStorage.setItem('active_loginid', preferred.account_id);

                /* scrub PKCE material */
                sessionStorage.removeItem('pkce_code_verifier');
                sessionStorage.removeItem('oauth_state');

                /* 4. Back to where the user started */
                const redirect_url = sessionStorage.getItem('redirect_url');
                sessionStorage.removeItem('redirect_url');
                window.location.replace(
                    redirect_url && !redirect_url.includes('/callback') ? redirect_url : window.location.origin
                );
            } catch (e: unknown) {
                clearAuthData(false);
                setError(e instanceof Error ? e.message : String(e));
            }
        })();
    }, []);

    if (error) {
        return (
            <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', gap: 16, padding: 24 }}>
                <h3>{localize('Deriv sign-in failed')}</h3>
                <p style={{ maxWidth: 480, textAlign: 'center' }}>{error}</p>
                <Button onClick={() => window.location.replace(window.location.origin)}>
                    {localize('Back to Bot')}
                </Button>
            </div>
        );
    }

    return <ChunkLoader message={localize('Signing in with Deriv…')} />;
};

export default CallbackPage;
