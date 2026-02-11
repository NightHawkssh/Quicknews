'use client';

import { useState } from 'react';
import { Button } from './ui';

interface RefreshButtonProps {
  onRefreshComplete?: () => void;
}

export default function RefreshButton({ onRefreshComplete }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setResult(null);

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: `Scraped ${data.data.summary.totalArticles} articles from ${data.data.summary.sourcesSuccessful}/${data.data.summary.sourcesScraped} sources`,
        });
        onRefreshComplete?.();
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to refresh',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error occurred',
      });
    } finally {
      setIsRefreshing(false);
      // Clear result after 5 seconds
      setTimeout(() => setResult(null), 5000);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleRefresh}
        isLoading={isRefreshing}
        disabled={isRefreshing}
      >
        <svg
          className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        {isRefreshing ? 'Refreshing...' : 'Refresh News'}
      </Button>

      {result && (
        <span
          className={`text-sm ${
            result.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {result.message}
        </span>
      )}
    </div>
  );
}
