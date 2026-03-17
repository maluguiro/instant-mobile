import { useEffect, useState } from 'react';

import { getCachedAuthState, loadAuthState, subscribeAuth, AuthUser } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(getCachedAuthState().user);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadAuthState().then((state) => {
      if (!active) return;
      setUser(state.user);
      setLoading(false);
    });
    return subscribeAuth((state) => {
      if (!active) return;
      setUser(state.user);
    });
  }, []);

  return { user, loading };
}
