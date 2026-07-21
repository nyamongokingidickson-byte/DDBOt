/* ============================================================
   PATCHED for Deriv NEW API.
   - Legacy acct1/token1 URL parsing removed (the new flow lands
     on /callback with ?code=&state= — handled by CallbackPage).
   - This wrapper now only restores an existing bearer session
     (validates it against REST) before rendering the app.
   ============================================================ */
import React from 'react';
import ChunkLoader from '@/components/loader/chunk-loader';
import { fetchV2Accounts, V2GetActiveToken } from '@/external/bot-skeleton/services/api/appId';
import { observer as globalObserver } from '@/external/bot-skeleton/utils/observer';
import { useOfflineDetection } from '@/hooks/useOfflineDetection';
import { clearAuthData } from '@/utils/auth-utils';
import { localize } from '@deriv-com/translations';
import App from './App';

const restoreSession = async (isOnline: boolean): Promise<void> => {
    const token = V2GetActiveToken();
    if (!token) return; // logged-out visitor — app renders its logged-out view

    if (!isOnline) {
        // eslint-disable-next-line no-console
        console.log('[Auth] Offline mode - using cached session');
        return;
    }

    try {
        /* Validate the bearer token & refresh the account cache */
        const accounts = await fetchV2Accounts(token);
        if (!accounts.length) {
            clearAuthData(false);
            return;
        }
        const active = localStorage.getItem('active_loginid');
        const still_exists = accounts.some((a: { account_id: string }) => a.account_id === active);
        if (!active || !still_exists) {
            const preferred =
                accounts.find((a: { account_type: string }) => a.account_type === 'demo') ?? accounts[0];
            localStorage.setItem('active_loginid', preferred.account_id);
        }
    } catch (error: unknown) {
        const err = error as { code?: string };
        if (err?.code === 'InvalidToken') {
            /* Bearer expired (1h lifetime) → clear session; the app shows the
               logged-out view and the Login button restarts the PKCE flow. */
            clearAuthData(false);
            globalObserver.emit('InvalidToken', { error });
        } else {
            // eslint-disable-next-line no-console
            console.error('[Auth] Session restore error:', error);
        }
    }
};

export const AuthWrapper = () => {
    const [isAuthComplete, setIsAuthComplete] = React.useState(false);
    const { isOnline } = useOfflineDetection();

    React.useEffect(() => {
        const initializeAuth = async () => {
            try {
                await restoreSession(isOnline);
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error('[Auth] Authentication initialization failed:', error);
            } finally {
                setIsAuthComplete(true);
            }
        };

        if (!isOnline) {
            setIsAuthComplete(true);
        }

        initializeAuth();
    }, [isOnline]);

    /* Timeout guard so the app never hangs on a slow REST call */
    React.useEffect(() => {
        const timeout = setTimeout(() => setIsAuthComplete(true), 8000);
        return () => clearTimeout(timeout);
    }, []);

    const getLoadingMessage = () => {
        if (!isOnline) return localize('Loading offline mode...');
        return localize('Initializing...');
    };

    if (!isAuthComplete) {
        return <ChunkLoader message={getLoadingMessage()} />;
    }

    return <App />;
};
