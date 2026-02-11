'use client';

import { useState } from 'react';
import useSWR from 'swr';
import ArticleCard from './ArticleCard';
import { ArticleGridSkeleton } from './ui/Skeleton';
import { Button } from './ui';

interface Source {
  id: string;
  name: string;
  url: string;
}

interface Article {
  id: string;
  title: string;
  summary: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
  source: Source;
}

interface ArticlesResponse {
  success: boolean;
  data: {
    items: Article[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ArticleGrid() {
  const [page, setPage] = useState(1);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());

  const { data: sourcesData } = useSWR<{ success: boolean; data: Source[] }>(
    '/api/sources',
    fetcher
  );

  const sourceIdsParam = selectedSources.size > 0
    ? `&sourceIds=${Array.from(selectedSources).join(',')}`
    : '';

  const { data, error, isLoading } = useSWR<ArticlesResponse>(
    `/api/articles?page=${page}&pageSize=100${sourceIdsParam}`,
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000,
      revalidateOnFocus: true,
    }
  );

  const sources = sourcesData?.data || [];
  const articles = data?.data?.items || [];
  const totalPages = data?.data?.totalPages || 1;

  const toggleSource = (id: string) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setPage(1);
  };

  const clearFilters = () => {
    setSelectedSources(new Set());
    setPage(1);
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">Failed to load articles</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Source Filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={clearFilters}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            selectedSources.size === 0
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
          }`}
        >
          All
        </button>
        {sources.map((source) => (
          <button
            key={source.id}
            onClick={() => toggleSource(source.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selectedSources.has(source.id)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            {source.name}
          </button>
        ))}
        {selectedSources.size > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            {selectedSources.size} selected
          </span>
        )}
      </div>

      {/* Articles List */}
      {isLoading ? (
        <ArticleGridSkeleton count={10} />
      ) : articles.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-10 w-10 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
            />
          </svg>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            No articles found. Try refreshing the news feed.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {articles.map((article) => (
            <ArticleCard
              key={article.id}
              id={article.id}
              title={article.title}
              summary={article.summary}
              imageUrl={article.imageUrl}
              publishedAt={article.publishedAt}
              source={article.source}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="px-3 text-xs text-gray-600 dark:text-gray-400">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
