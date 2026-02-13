'use client';

import { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import useSWR from 'swr';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui';
import Skeleton from '@/components/ui/Skeleton';

interface Source {
  id: string;
  name: string;
  url: string;
}

interface Article {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  sourceUrl: string;
  imageUrl: string | null;
  author: string | null;
  publishedAt: string | null;
  scrapedAt: string;
  source: Source;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, error, isLoading } = useSWR<{ success: boolean; data: Article }>(
    `/api/articles/${id}`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="w-32 h-6 mb-6" />
        <Skeleton className="w-full h-12 mb-4" />
        <Skeleton className="w-3/4 h-12 mb-6" />
        <div className="flex gap-4 mb-8">
          <Skeleton className="w-32 h-5" />
          <Skeleton className="w-24 h-5" />
        </div>
        <Skeleton className="w-full h-96 mb-8" />
        <div className="space-y-4">
          <Skeleton className="w-full h-6" />
          <Skeleton className="w-full h-6" />
          <Skeleton className="w-3/4 h-6" />
        </div>
      </div>
    );
  }

  if (error || !data?.success || !data?.data) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Article Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The article you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const article = data.data;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Back Link */}
      <Link
        href="/"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-6"
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        Back to News
      </Link>

      {/* Article Header */}
      <article>
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              {article.source.name}
            </span>
            {article.publishedAt && (
              <time className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(article.publishedAt)}
              </time>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 leading-tight mb-4">
            {article.title}
          </h1>

          {article.author && (
            <p className="text-gray-600 dark:text-gray-400">
              By <span className="font-medium">{article.author}</span>
            </p>
          )}
        </header>

        {/* Featured Image */}
        {article.imageUrl && (
          <div className="relative w-full h-48 sm:h-64 md:h-96 mb-8 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              className="object-cover"
              priority
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Summary */}
        {article.summary && !article.content && (
          <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
            <p className="text-base sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
              {article.summary}
            </p>
          </div>
        )}

        {/* Content */}
        {article.content ? (
          <div
            className="prose prose-lg dark:prose-invert max-w-none mb-8"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 mb-8">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Full article content is not available. Read the complete article on the original source.
            </p>
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Read on {article.source.name}
              <svg
                className="w-4 h-4 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        )}

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-800 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Last updated: {formatDate(article.scrapedAt)}
            </div>
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors"
            >
              View Original Article
              <svg
                className="w-4 h-4 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>
        </footer>
      </article>
    </div>
  );
}
