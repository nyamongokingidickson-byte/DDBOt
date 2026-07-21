/* ============================================================
   PATCHED for Deriv NEW API.
   - generateDerivApiInstance(): PUBLIC market-data socket
     (wss://api.derivws.com/.../ws/public?app_id=<client id>)
   - generateTradingApiInstance(): OTP-authenticated trading
     socket for the active account (REST /accounts/{id}/otp).
     The OTP socket needs NO `authorize` call.
   Legacy helper names are preserved.
   ============================================================ */
import { APP_ID, REST_BASE, WS_PUBLIC_URL } from '@/components/shared/utils/config/config';
import DerivAPIBasic from '@deriv/deriv-api/dist/DerivAPIBasic';
import APIMiddleware from './api-middleware';

/* ---------------- session helpers (new API) ---------------- */
export const V2GetActiveToken = () => {
    const token = sessionStorage.getItem('deriv_v2_token') || localStorage.getItem('authToken');
    const exp = +(sessionStorage.getItem('deriv_v2_token_exp') || 0);
    if (!token || token === 'null') return null;
    if (exp && Date.now() >= exp) return null; // expired bearer
    return token;
};

export const getLoginId = () => {
    const login_id = localStorage.getItem('active_loginid');
    if (login_id && login_id !== 'null') return login_id;
    return null;
};

export const V2GetActiveClientId = () => getLoginId();

export const getToken = () => ({
    token: V2GetActiveToken(),
    account_id: getLoginId(),
});

/* ---------------- PUBLIC socket (market data, no auth) ---------------- */
export const generateDerivApiInstance = () => {
    const deriv_socket = new WebSocket(WS_PUBLIC_URL);
    const deriv_api = new DerivAPIBasic({
        connection: deriv_socket,
        middleware: new APIMiddleware({}),
    });
    return deriv_api;
};

/* ---------------- TRADING socket (OTP-authenticated) ----------------
   1. POST /trading/v1/options/accounts/{account_id}/otp  (Bearer token)
   2. Response contains a ready-to-use wss URL with ?otp=...
   3. Connect — the socket is already authorized for that account.  */
export const fetchTradingSocketUrl = async (account_id, bearer_token) => {
    const token = bearer_token || V2GetActiveToken();
    const id = account_id || getLoginId();
    if (!token || !id) throw new Error('Not logged in');
    const response = await fetch(`${REST_BASE}/trading/v1/options/accounts/${encodeURIComponent(id)}/otp`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Deriv-App-ID': APP_ID,
        },
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json?.data?.url) {
        const msg = json?.errors?.[0]?.message || `OTP request failed (HTTP ${response.status})`;
        const err = new Error(msg);
        err.code = response.status === 401 ? 'InvalidToken' : 'OtpFailed';
        throw err;
    }
    return json.data.url;
};

export const generateTradingApiInstance = async (account_id, bearer_token) => {
    const url = await fetchTradingSocketUrl(account_id, bearer_token);
    const deriv_socket = new WebSocket(url);
    const deriv_api = new DerivAPIBasic({
        connection: deriv_socket,
        middleware: new APIMiddleware({}),
    });
    return deriv_api;
};

/* ---------------- REST: account list (replaces authorize.account_list) */
export const fetchV2Accounts = async bearer_token => {
    const token = bearer_token || V2GetActiveToken();
    if (!token) return [];
    const response = await fetch(`${REST_BASE}/trading/v1/options/accounts`, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Deriv-App-ID': APP_ID,
        },
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
        const err = new Error(json?.errors?.[0]?.message || `Accounts fetch failed (HTTP ${response.status})`);
        err.code = response.status === 401 ? 'InvalidToken' : 'AccountsFailed';
        throw err;
    }
    const accounts = json.data ?? [];
    localStorage.setItem('v2_accounts', JSON.stringify(accounts));
    return accounts;
};
