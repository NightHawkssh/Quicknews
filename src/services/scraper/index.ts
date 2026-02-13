import { prisma } from '@/lib/db';
import { SelectorConfig, ScrapedArticle, ScrapeResult } from '@/types';
import { fetchPage } from './fetcher';
import { parseListPage, parseArticlePage } from './parser';
import { autoDetectArticles } from './auto-detect';

const MAX_ARTICLES_PER_SOURCE = 50;
const FETCH_FULL_CONTENT = false; // Set to true to fetch full article content (slower)

export async function scrapeSource(sourceId: string): Promise<ScrapeResult> {
  const source = await prisma.source.findUnique({
    where: { id: sourceId },
  });

  if (!source) {
    return {
      source: 'Unknown',
      success: false,
      articlesCount: 0,
      error: 'Source not found',
    };
  }

  const selectors: SelectorConfig = JSON.parse(source.selectors);
  const result: ScrapeResult = {
    source: source.name,
    success: false,
    articlesCount: 0,
  };

  // Use listPage.url if set, otherwise fall back to the source's main URL
  const listPageUrl = selectors.listPage.url || source.url;

  console.log(`[Scraper] Starting scrape for ${source.name} from ${listPageUrl}`);

  try {
    // Fetch the list page
    const html = await fetchPage(listPageUrl, {
      rateLimit: source.rateLimit,
    });

    console.log(`[Scraper] Fetched list page for ${source.name}, HTML length: ${html.length}`);

    // Parse articles from the list page using configured selectors
    let articles = parseListPage(html, selectors, listPageUrl);

    console.log(`[Scraper] Parsed ${articles.length} articles from ${source.name} using selectors`);

    // If selectors found nothing, fall back to auto-detection
    if (articles.length === 0) {
      console.log(`[Scraper] Selectors found 0 articles for ${source.name}, trying auto-detection...`);
      articles = autoDetectArticles(html, listPageUrl);
      console.log(`[Scraper] Auto-detection found ${articles.length} articles from ${source.name}`);
    }

    // Limit the number of articles to process
    const articlesToProcess = articles.slice(0, MAX_ARTICLES_PER_SOURCE);

    let savedCount = 0;
    for (const article of articlesToProcess) {
      try {
        let fullContent: Partial<ScrapedArticle> = {};

        // Optionally fetch full article content
        if (FETCH_FULL_CONTENT) {
          try {
            const articleHtml = await fetchPage(article.sourceUrl, {
              rateLimit: source.rateLimit,
            });
            fullContent = parseArticlePage(articleHtml, selectors);
          } catch (contentError) {
            console.log(`[Scraper] Could not fetch full content for ${article.sourceUrl}`);
          }
        }

        // Upsert the article
        await prisma.article.upsert({
          where: { sourceUrl: article.sourceUrl },
          update: {
            title: fullContent.title || article.title,
            summary: article.summary,
            content: fullContent.content,
            imageUrl: fullContent.imageUrl || article.imageUrl,
            author: fullContent.author,
            publishedAt: fullContent.publishedAt || article.publishedAt,
            scrapedAt: new Date(),
          },
          create: {
            title: fullContent.title || article.title,
            summary: article.summary,
            content: fullContent.content,
            sourceUrl: article.sourceUrl,
            imageUrl: fullContent.imageUrl || article.imageUrl,
            author: fullContent.author,
            publishedAt: fullContent.publishedAt || article.publishedAt,
            sourceId: source.id,
          },
        });
        savedCount++;
      } catch (articleError) {
        console.error(`[Scraper] Error saving article ${article.sourceUrl}:`, articleError);
      }
    }

    // Update source's last scraped time
    await prisma.source.update({
      where: { id: sourceId },
      data: { lastScrapedAt: new Date() },
    });

    result.success = true;
    result.articlesCount = savedCount;
    console.log(`[Scraper] Successfully scraped ${savedCount} articles from ${source.name}`);
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Scraper] Error scraping ${source.name}:`, error);
  }

  return result;
}

export async function scrapeAllSources(): Promise<ScrapeResult[]> {
  const sources = await prisma.source.findMany({
    where: { isActive: true },
  });

  console.log(`[Scraper] Starting scrape for ${sources.length} sources`);

  const results: ScrapeResult[] = [];

  for (const source of sources) {
    const result = await scrapeSource(source.id);
    results.push(result);
  }

  const successCount = results.filter(r => r.success).length;
  const totalArticles = results.reduce((sum, r) => sum + r.articlesCount, 0);
  console.log(`[Scraper] Completed: ${successCount}/${sources.length} sources, ${totalArticles} articles`);

  return results;
}

export async function getScrapingStatus() {
  const sources = await prisma.source.findMany({
    select: {
      id: true,
      name: true,
      isActive: true,
      lastScrapedAt: true,
      _count: {
        select: { articles: true },
      },
    },
  });

  const settings = await prisma.settings.findUnique({
    where: { id: 'global' },
  });

  return {
    sources: sources.map((s) => ({
      id: s.id,
      name: s.name,
      isActive: s.isActive,
      lastScrapedAt: s.lastScrapedAt,
      articleCount: s._count.articles,
    })),
    settings: settings ?? {
      scrapeInterval: 30,
      enableAutoScrape: true,
    },
  };
}

export { fetchPage } from './fetcher';
export { parseListPage, parseArticlePage } from './parser';
export { rateLimiter } from './rate-limiter';
