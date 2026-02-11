'use client';

import { useCallback } from 'react';
import { useSWRConfig } from 'swr';
import ArticleGrid from '@/components/ArticleGrid';
import RefreshButton from '@/components/RefreshButton';

export default function HomePage() {
  const { mutate } = useSWRConfig();

  const handleRefreshComplete = useCallback(() => {
    // Revalidate all article queries
    mutate((key) => typeof key === 'string' && key.startsWith('/api/articles'));
  }, [mutate]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Latest Financial News
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Stay updated with the latest news from top Indian financial sources
          </p>
        </div>
        <RefreshButton onRefreshComplete={handleRefreshComplete} />
      </div>

      <ArticleGrid />
    </div>
  );
}
