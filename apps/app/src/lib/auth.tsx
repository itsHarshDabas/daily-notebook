import type { Session } from '@supabase/supabase-js';
import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';

import type { Gender } from '@daily-notebook/shared';

import { supabase } from './supabase';

export interface Profile {
  id: string;
  name: string | null;
  gender: Gender | null;
  periodTrackingHidden: boolean;
  avatarFileId: string | null;
  currency: string;
}

interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

type ProfileRow = {
  id: string;
  name: string | null;
  gender: Gender | null;
  period_tracking_hidden: boolean;
  avatar_file_id: string | null;
  currency: string;
};

function toProfile(r: ProfileRow): Profile {
  return {
    id: r.id,
    name: r.name,
    gender: r.gender,
    periodTrackingHidden: r.period_tracking_hidden,
    avatarFileId: r.avatar_file_id,
    currency: r.currency,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, gender, period_tracking_hidden, avatar_file_id, currency')
      .eq('id', s.user.id)
      .single<ProfileRow>();
    if (error) console.warn('Could not load profile', error.message);
    setProfile(data ? toProfile(data) : null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      // Supabase advises against awaiting other Supabase calls inside this callback.
      setTimeout(() => loadProfile(s), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const value: AuthState = {
    loading,
    session,
    profile,
    refreshProfile: () => loadProfile(session),
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const ctx = use(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
