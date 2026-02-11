import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

interface SelectorConfig {
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

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

const defaultSources: Array<{
  name: string;
  url: string;
  selectors: SelectorConfig;
  rateLimit: number;
}> = [
  {
    name: 'Business Standard',
    url: 'https://www.business-standard.com/',
    rateLimit: 2000,
    selectors: {
      listPage: {
        url: 'https://www.business-standard.com/markets/news',
        articleContainer: '.cardlist-stroy, .smallcard-story, [class*="card"]',
        title: 'a.smallcard-title, h2 a, h3 a, .headline a',
        link: 'a.smallcard-title, a[href*=".html"]',
        summary: '.smallcard-desc, p',
        image: 'img[src*="business-standard"]',
        date: 'time, .date, .timestamp',
      },
      articlePage: {
        title: 'h1.headline, h1',
        content: '.story-content, .p-content, [class*="storycontent"], article',
        image: '.article-image img, picture img',
        date: 'time, .date-info, .timestamp',
        author: '.author-name, .byline, [class*="author"]',
      },
      transforms: {
        baseUrl: 'https://www.business-standard.com',
        contentCleanup: ['.ad', '.advertisement', '.social-share', 'script', 'style'],
      },
    },
  },
  {
    name: 'Economic Times',
    url: 'https://economictimes.indiatimes.com/',
    rateLimit: 2000,
    selectors: {
      listPage: {
        url: 'https://economictimes.indiatimes.com/markets/stocks/news',
        articleContainer: '.eachStory, [class*="story"], li[data-type]',
        title: 'a[href*="/articleshow/"], h3 a, h4 a',
        link: 'a[href*="/articleshow/"]',
        summary: '.desc, p',
        image: 'img[src*="etimg"], img[data-src]',
        date: 'time, .date-text, span[class*="date"]',
      },
      articlePage: {
        title: 'h1.artTitle, h1',
        content: '.artText, .article-body, [class*="article_content"]',
        image: '.article-img img, figure img',
        date: 'time, .publish_on, .article-date',
        author: '.author, .byline, [class*="author"]',
      },
      transforms: {
        baseUrl: 'https://economictimes.indiatimes.com',
        contentCleanup: ['.ad', '.tg-ads', 'script', 'style'],
      },
    },
  },
  {
    name: 'Zerodha Pulse',
    url: 'https://pulse.zerodha.com/',
    rateLimit: 3000,
    selectors: {
      listPage: {
        url: 'https://pulse.zerodha.com/',
        articleContainer: '.box, .item, article, li.news-item',
        title: 'h2 a, h3 a, a.title, .title a',
        link: 'h2 a, h3 a, a[href*="pulse.zerodha"]',
        summary: '.desc, .description, p',
        image: 'img',
        date: 'time, .date, .timestamp, span.time',
      },
      articlePage: {
        title: 'h1',
        content: '.content, article, .post-content',
        image: 'img.featured, .hero img',
        date: 'time, .date',
        author: '.author, .byline',
      },
      transforms: {
        baseUrl: 'https://pulse.zerodha.com',
      },
    },
  },
  {
    name: 'Moneycontrol',
    url: 'https://www.moneycontrol.com/',
    rateLimit: 2500,
    selectors: {
      listPage: {
        url: 'https://www.moneycontrol.com/news/business/markets/',
        articleContainer: 'li.clearfix, li[id^="newslist"], .news_listing li',
        title: 'h2, h3, a[title]',
        link: 'a[href*="moneycontrol.com/news"]',
        summary: 'p',
        image: 'img[src*="moneycontrol"], img[data-src]',
        date: 'time, .date, span.ago',
      },
      articlePage: {
        title: 'h1.article_title, h1',
        content: '#contentdata, .article_content, .content_wrapper',
        image: '.article_image img, figure img',
        date: '.article_schedule time, time',
        author: '.article_author a, .author',
      },
      transforms: {
        baseUrl: 'https://www.moneycontrol.com',
        contentCleanup: ['.ad', '.advertisement', '.social-share', 'script', 'style', '.tg-ads'],
      },
    },
  },
  {
    name: 'Financial Express',
    url: 'https://www.financialexpress.com/',
    rateLimit: 2000,
    selectors: {
      listPage: {
        url: 'https://www.financialexpress.com/market/stock-market/',
        articleContainer: 'article, .article-item, [class*="story-card"], li[class*="article"]',
        title: 'h2 a, h3 a, .entry-title a, a[title]',
        link: 'a[href*="financialexpress.com"]',
        summary: '.excerpt, .desc, p',
        image: 'img[src*="financialexpress"], img[data-src]',
        date: 'time, .date, .post-date',
      },
      articlePage: {
        title: 'h1.entry-title, h1',
        content: '.pcl-full-content, .entry-content, .article-content',
        image: '.featured-image img, figure img',
        date: 'time, .post-date',
        author: '.author-name, .byline',
      },
      transforms: {
        baseUrl: 'https://www.financialexpress.com',
        contentCleanup: ['.ad', '.advertisement', 'script', 'style'],
      },
    },
  },
  {
    name: 'Investing.com India',
    url: 'https://in.investing.com/',
    rateLimit: 3000,
    selectors: {
      listPage: {
        url: 'https://in.investing.com/news/stock-market-news',
        articleContainer: 'article, [data-test="article-item"], .js-article-item',
        title: 'a[data-test="article-title-link"], h3 a, .title',
        link: 'a[data-test="article-title-link"], a[href*="/news/"]',
        summary: '.description, p',
        image: 'img[data-src], img[src*="investing"]',
        date: 'time, span[data-test="article-publish-date"]',
      },
      articlePage: {
        title: 'h1[data-test="article-title"], h1',
        content: '.article_WYSIWYG__O0uhw, .articlePage, [data-test="article-body"]',
        image: 'img[data-test="article-image"]',
        date: 'time, span[class*="date"]',
        author: 'span[data-test="article-author"], .byline',
      },
      transforms: {
        baseUrl: 'https://in.investing.com',
        contentCleanup: ['.ad', '.advertisement', 'script', 'style'],
      },
    },
  },
];

async function main() {
  console.log('Seeding database...');

  // Create settings
  await prisma.settings.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      scrapeInterval: 30,
      enableAutoScrape: true,
    },
  });
  console.log('Created global settings');

  // Create sources
  for (const source of defaultSources) {
    await prisma.source.upsert({
      where: { name: source.name },
      update: {
        url: source.url,
        selectors: JSON.stringify(source.selectors),
        rateLimit: source.rateLimit,
      },
      create: {
        name: source.name,
        url: source.url,
        selectors: JSON.stringify(source.selectors),
        rateLimit: source.rateLimit,
        isActive: true,
      },
    });
    console.log(`Created/updated source: ${source.name}`);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
