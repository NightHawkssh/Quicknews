'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatRelativeTime, formatDate, truncateText } from '@/lib/utils';

interface ArticleCardProps {
  id: string;
  title: string;
  summary?: string | null;
  imageUrl?: string | null;
  publishedAt?: Date | string | null;
  source: {
    name: string;
  };
}

export default function ArticleCard({
  id,
  title,
  summary,
  imageUrl,
  publishedAt,
  source,
}: ArticleCardProps) {
  const [timeDisplay, setTimeDisplay] = useState<string>('');

  useEffect(() => {
    setTimeDisplay(formatRelativeTime(publishedAt));
    // Update every minute
    const interval = setInterval(() => {
      setTimeDisplay(formatRelativeTime(publishedAt));
    }, 60000);
    return () => clearInterval(interval);
  }, [publishedAt]);

  return (
    <Link href={`/article/${id}`}>
      <article className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200">
        <div className="relative h-48 bg-gray-100 dark:bg-gray-800 overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-16 h-16 text-gray-300 dark:text-gray-600"
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
            </div>
          )}
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-300 backdrop-blur-sm">
              {source.name}
            </span>
          </div>
        </div>

        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </h3>

          {summary && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
              {truncateText(summary, 150)}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
            <time suppressHydrationWarning>{timeDisplay || formatDate(publishedAt)}</time>
            <span className="text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
              Read more
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
