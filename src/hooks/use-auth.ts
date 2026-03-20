import { useEffect, useState } from 'react';

import { getCachedAuthState, loadAuthState, subscribeAuth, AuthUser, fetchProfile, signOut } from '@/lib/auth';

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
      if (state.token && !state.biometricsEnabled) {
        fetchProfile()
          .then((fresh) => {
            if (!active) return;
            if (!fresh) {
              signOut().then(() => setUser(null));
              return;
            }
            setUser(fresh);
          })
          .catch(async () => {
            if (!active) return;
            await signOut();
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
