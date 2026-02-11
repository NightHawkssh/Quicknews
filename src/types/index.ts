export interface SelectorConfig {
  listPage: {
    url: string;
    articleContainer: string;
    title: string;
    link: string;
    summary?: string;
    image?: string;
    date?: string;
  };
  articlePage: {
    title: string;
    content: string;
    image?: string;
    date?: string;
    author?: string;
  };
  transforms?: {
    baseUrl?: string;
    contentCleanup?: string[];
  };
}

export interface Source {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  selectors: SelectorConfig;
  rateLimit: number;
  lastScrapedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Article {
  id: string;
  title: string;
  summary: string | null;
  content: string | null;
  sourceUrl: string;
  imageUrl: string | null;
  author: string | null;
  publishedAt: Date | null;
  sourceId: string;
  source?: Source;
  scrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Settings {
  id: string;
  scrapeInterval: number;
  enableAutoScrape: boolean;
  updatedAt: Date;
}

export interface ScrapedArticle {
  title: string;
  summary?: string;
  content?: string;
  sourceUrl: string;
  imageUrl?: string;
  author?: string;
  publishedAt?: Date;
}

export interface ScrapeResult {
  source: string;
  success: boolean;
  articlesCount: number;
  error?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
