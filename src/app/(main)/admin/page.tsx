'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';
import { Button, Card, CardContent, CardHeader } from '@/components/ui';

interface SourceStatus {
  id: string;
  name: string;
  isActive: boolean;
  lastScrapedAt: string | null;
  articleCount: number;
}

interface ScrapingStatus {
  sources: SourceStatus[];
  settings: {
    scrapeInterval: number;
    enableAutoScrape: boolean;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshingSourceId, setRefreshingSourceId] = useState<string | null>(null);

  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean;
    data: ScrapingStatus;
  }>('/api/scrape', fetcher, {
    refreshInterval: 30000,
  });

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await fetch('/api/scrape', { method: 'POST' });
      mutate();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefreshSource = async (sourceId: string) => {
    setRefreshingSourceId(sourceId);
    try {
      await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId }),
      });
      mutate();
    } finally {
      setRefreshingSourceId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">Failed to load dashboard</p>
          <Button onClick={() => mutate()}>Retry</Button>
        </div>
      </div>
    );
  }

  const { sources, settings } = data.data;
  const totalArticles = sources.reduce((acc, s) => acc + s.articleCount, 0);
  const activeSources = sources.filter((s) => s.isActive).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage news sources and scraping settings
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/sources">
            <Button variant="outline">Manage Sources</Button>
          </Link>
          <Button onClick={handleRefreshAll} isLoading={isRefreshing}>
            Refresh All
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <svg
                  className="w-6 h-6 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Articles
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {totalArticles.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
                <svg
                  className="w-6 h-6 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active Sources
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {activeSources} / {sources.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <svg
                  className="w-6 h-6 text-purple-600 dark:text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Scrape Interval
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {settings.scrapeInterval} min
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sources Table — desktop */}
      <Card className="hidden md:block">
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Source Status
          </h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Articles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Scraped
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {sources.map((source) => (
                <tr key={source.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {source.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        source.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {source.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {source.articleCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {source.lastScrapedAt
                      ? formatRelativeTime(source.lastScrapedAt)
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRefreshSource(source.id)}
                      isLoading={refreshingSourceId === source.id}
                      disabled={!source.isActive || refreshingSourceId !== null}
                    >
                      Refresh
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Sources Cards — mobile */}
      <div className="md:hidden space-y-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Source Status
        </h2>
        {sources.map((source) => (
          <Card key={source.id}>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {source.name}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    source.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {source.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
                <div className="flex justify-between">
                  <span>Articles</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{source.articleCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Scraped</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {source.lastScrapedAt
                      ? formatRelativeTime(source.lastScrapedAt)
                      : 'Never'}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleRefreshSource(source.id)}
                isLoading={refreshingSourceId === source.id}
                disabled={!source.isActive || refreshingSourceId !== null}
              >
                Refresh
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
