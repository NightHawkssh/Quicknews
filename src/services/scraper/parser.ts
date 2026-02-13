import * as cheerio from 'cheerio';
import { SelectorConfig, ScrapedArticle } from '@/types';
import { normalizeUrl, cleanHtml, truncateText } from '@/lib/utils';

export function parseListPage(
  html: string,
  selectors: SelectorConfig,
  pageUrl?: string
): ScrapedArticle[] {
  const $ = cheerio.load(html);
  const articles: ScrapedArticle[] = [];
  const { listPage, transforms } = selectors;
  const baseUrl = transforms?.baseUrl || pageUrl || '';
  const seenUrls = new Set<string>();

  // Try multiple container selectors
  const containerSelectors = listPage.articleContainer.split(',').map(s => s.trim());

  for (const containerSelector of containerSelectors) {
    $(containerSelector).each((_, element) => {
      const $el = $(element);

      // Try multiple title selectors
      let title = '';
      const titleSelectors = listPage.title.split(',').map(s => s.trim());
      for (const sel of titleSelectors) {
        const titleEl = $el.find(sel).first();
        title = titleEl.text().trim();
        if (title && title.length > 10) break;
      }

      if (!title || title.length < 10) return; // Skip if no meaningful title

      // Try multiple link selectors
      let sourceUrl = '';
      const linkSelectors = listPage.link.split(',').map(s => s.trim());
      for (const sel of linkSelectors) {
        const linkEl = $el.find(sel).first();
        sourceUrl = linkEl.attr('href') || '';
        if (sourceUrl) break;
      }

      // Fallback: try to find any anchor with href
      if (!sourceUrl) {
        const anyAnchor = $el.find('a[href]').first();
        sourceUrl = anyAnchor.attr('href') || '';
      }

      sourceUrl = normalizeUrl(sourceUrl, baseUrl);

      if (!sourceUrl || seenUrls.has(sourceUrl)) return; // Skip if no link or duplicate
      seenUrls.add(sourceUrl);

      // Skip non-article URLs
      if (sourceUrl.includes('javascript:') || sourceUrl === '#') {
        return;
      }

      // Extract summary
      let summary: string | undefined;
      if (listPage.summary) {
        const summarySelectors = listPage.summary.split(',').map(s => s.trim());
        for (const sel of summarySelectors) {
          const summaryText = $el.find(sel).first().text().trim();
          if (summaryText && summaryText.length > 20 && summaryText !== title) {
            summary = truncateText(cleanHtml(summaryText), 300);
            break;
          }
        }
      }

      // Extract image
      let imageUrl: string | undefined;
      if (listPage.image) {
        const imageSelectors = listPage.image.split(',').map(s => s.trim());
        for (const sel of imageSelectors) {
          const imgEl = $el.find(sel).first();
          imageUrl =
            imgEl.attr('data-src') ||
            imgEl.attr('data-lazy-src') ||
            imgEl.attr('data-original') ||
            imgEl.attr('src');
          if (imageUrl && !imageUrl.includes('grey_bg') && !imageUrl.includes('placeholder') && !imageUrl.startsWith('data:')) {
            imageUrl = normalizeUrl(imageUrl, baseUrl);
            break;
          }
          imageUrl = undefined;
        }
      }

      // Extract date
      let publishedAt: Date | undefined;
      if (listPage.date) {
        const dateSelectors = listPage.date.split(',').map(s => s.trim());
        for (const sel of dateSelectors) {
          const dateEl = $el.find(sel).first();
          const dateStr = dateEl.attr('datetime') || dateEl.text().trim();
          if (dateStr) {
            const parsed = parseDate(dateStr);
            if (parsed) {
              publishedAt = parsed;
              break;
            }
          }
        }
      }

      articles.push({
        title,
        summary,
        sourceUrl,
        imageUrl,
        publishedAt,
      });
    });

    // If we found articles with this container, don't try other containers
    if (articles.length > 0) break;
  }

  return articles;
}

function parseDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;

  // Try standard date parsing
  let parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Try relative time parsing (e.g., "2 hours ago", "3 days ago")
  const relativeMatch = dateStr.match(/(\d+)\s*(hour|hr|minute|min|day|week|month)s?\s*ago/i);
  if (relativeMatch) {
    const amount = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    const now = new Date();

    switch (unit) {
      case 'minute':
      case 'min':
        now.setMinutes(now.getMinutes() - amount);
        break;
      case 'hour':
      case 'hr':
        now.setHours(now.getHours() - amount);
        break;
      case 'day':
        now.setDate(now.getDate() - amount);
        break;
      case 'week':
        now.setDate(now.getDate() - (amount * 7));
        break;
      case 'month':
        now.setMonth(now.getMonth() - amount);
        break;
    }
    return now;
  }

  // Try Indian date formats (e.g., "11 Feb 2026", "Feb 11, 2026")
  const indianMatch = dateStr.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*,?\s*(\d{4})?/i);
  if (indianMatch) {
    const months: { [key: string]: number } = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const day = parseInt(indianMatch[1]);
    const month = months[indianMatch[2].toLowerCase().slice(0, 3)];
    const year = indianMatch[3] ? parseInt(indianMatch[3]) : new Date().getFullYear();
    return new Date(year, month, day);
  }

  return undefined;
}

export function parseArticlePage(
  html: string,
  selectors: SelectorConfig
): Partial<ScrapedArticle> {
  const $ = cheerio.load(html);
  const { articlePage, transforms } = selectors;
  const baseUrl = transforms?.baseUrl || '';

  const result: Partial<ScrapedArticle> = {};

  // Extract title
  const titleSelectors = articlePage.title.split(',').map(s => s.trim());
  for (const sel of titleSelectors) {
    const title = $(sel).first().text().trim();
    if (title && title.length > 10) {
      result.title = title;
      break;
    }
  }

  // Extract content
  const contentSelectors = articlePage.content.split(',').map(s => s.trim());
  for (const sel of contentSelectors) {
    const contentEl = $(sel).first();
    if (contentEl.length) {
      // Remove unwanted elements
      contentEl.find('script, style, iframe, .ad, .advertisement, .social-share, noscript').remove();

      if (transforms?.contentCleanup) {
        transforms.contentCleanup.forEach((selector) => {
          contentEl.find(selector).remove();
        });
      }

      const content = contentEl.html()?.trim();
      if (content && content.length > 100) {
        result.content = content;
        break;
      }
    }
  }

  // Extract image
  if (articlePage.image) {
    const imageSelectors = articlePage.image.split(',').map(s => s.trim());
    for (const sel of imageSelectors) {
      const imgEl = $(sel).first();
      const imageUrl =
        imgEl.attr('data-src') ||
        imgEl.attr('data-lazy-src') ||
        imgEl.attr('data-original') ||
        imgEl.attr('src');
      if (imageUrl && !imageUrl.includes('placeholder') && !imageUrl.startsWith('data:')) {
        result.imageUrl = normalizeUrl(imageUrl, baseUrl);
        break;
      }
    }
  }

  // Extract date
  if (articlePage.date) {
    const dateSelectors = articlePage.date.split(',').map(s => s.trim());
    for (const sel of dateSelectors) {
      const dateEl = $(sel).first();
      const dateStr = dateEl.attr('datetime') || dateEl.text().trim();
      if (dateStr) {
        const parsed = parseDate(dateStr);
        if (parsed) {
          result.publishedAt = parsed;
          break;
        }
      }
    }
  }

  // Extract author
  if (articlePage.author) {
    const authorSelectors = articlePage.author.split(',').map(s => s.trim());
    for (const sel of authorSelectors) {
      const author = $(sel).first().text().trim();
      if (author && author.length > 2 && author.length < 100) {
        result.author = author;
        break;
      }
    }
  }

  return result;
}

export function extractText(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, iframe').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}
