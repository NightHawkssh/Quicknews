'use client';

import { useCallback } from 'react';
import { useSWRConfig } from 'swr';
import ArticleGrid from '@/components/ArticleGrid';
import RefreshButton from '@/components/RefreshButton';

export default function HomePage() {
  const { mutate } = useSWRConfig();

  const handleRefreshComplete = useCallback(() => {
    mutate((key) => typeof key === 'string' && key.startsWith('/api/articles'));
  }, [mutate]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Financial News
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Latest from top Indian financial sources
          </p>
        </div>
        <RefreshButton onRefreshComplete={handleRefreshComplete} />
      </div>

      <ArticleGrid />
    </div>
  );
}
