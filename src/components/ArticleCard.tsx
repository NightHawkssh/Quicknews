'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatRelativeTime, formatDate } from '@/lib/utils';

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
    const interval = setInterval(() => {
      setTimeDisplay(formatRelativeTime(publishedAt));
    }, 60000);
    return () => clearInterval(interval);
  }, [publishedAt]);

  return (
    <Link href={`/article/${id}`}>
      <article className="group flex gap-3 py-3 px-2 -mx-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors">
        {/* Thumbnail */}
        {imageUrl && (
          <div className="relative w-20 h-14 flex-shrink-0 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800">
            <Image
              src={imageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="80px"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            {title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              {source.name}
            </span>
            <span className="text-gray-300 dark:text-gray-600 text-xs">|</span>
            <time className="text-xs text-gray-500 dark:text-gray-500" suppressHydrationWarning>
              {timeDisplay || formatDate(publishedAt)}
            </time>
          </div>
        </div>
      </article>
    </Link>
  );
}
