import { useEffect, useState } from 'react';

import { getCachedAuthState, loadAuthState, subscribeAuth, AuthUser, fetchProfile, invalidateSession } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(getCachedAuthState().user);
  const [biometricsEnabled, setBiometricsEnabled] = useState(
    getCachedAuthState().biometricsEnabled ?? false
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadAuthState().then((state) => {
      if (!active) return;
      setUser(state.user);
      setBiometricsEnabled(state.biometricsEnabled ?? false);
      setLoading(false);
      if (state.token) {
        fetchProfile()
          .then((fresh) => {
            if (!active) return;
            if (!fresh) {
              invalidateSession().then(() => setUser(null));
              return;
            }
            setUser(fresh);
          })
          .catch(async () => {
            if (!active) return;
            await invalidateSession();
            setUser(null);
          });
      }
    });
    return subscribeAuth((state) => {
      if (!active) return;
      setUser(state.user);
      setBiometricsEnabled(state.biometricsEnabled ?? false);
    });
  }, []);

  return { user, loading, biometricsEnabled };
}
