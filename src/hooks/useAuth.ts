'use client';

import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: string;
  createdAt: string;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) return null;
    return res.json().then((d) => d.data ?? null);
  });

export function useAuth() {
  const router = useRouter();
  const { data: user, error, isLoading, mutate } = useSWR<AuthUser | null>(
    '/api/auth/me',
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    mutate(null, false);
    router.push('/login');
    router.refresh();
  }, [mutate, router]);

  return {
    user: user ?? null,
    isLoading: isLoading && !error,
    isAdmin: user?.role === 'admin',
    logout,
    mutate,
  };
}
