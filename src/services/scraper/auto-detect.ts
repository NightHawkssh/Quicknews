import * as cheerio from 'cheerio';
import { ScrapedArticle } from '@/types';
import { normalizeUrl } from '@/lib/utils';

// URL patterns that indicate an article
const ARTICLE_URL_PATTERNS = [
  /\/\d{4}\/\d{1,2}\//, // /2025/01/ date-based
  /\/news\//i,
  /\/article\//i,
  /\/story\//i,
  /\/blog\//i,
  /\/post\//i,
  /\/features?\//i,
  /\/opinion\//i,
  /\/analysis\//i,
  /\/review\//i,
  /\/exclusive\//i,
];

// URLs to skip
const SKIP_URL_PATTERNS = [
  /\/(tag|category|author|search|login|register|about|contact|privacy|terms|advertise|subscribe|faq)\b/i,
  /\.(css|js|png|jpg|jpeg|gif|svg|pdf|zip|xml|rss)(\?|$)/i,
  /^javascript:/,
  /^mailto:/,
  /^#/,
];

// Broad container selectors to try
const CONTAINER_SELECTORS = [
  'article',
  '[class*="ArticleCard"]',
  '[class*="article-card"]',
  '[class*="RegularCard"]',
  '[class*="StoryCard"]',
  '[class*="story-card"]',
  '[class*="NewsCard"]',
  '[class*="news-card"]',
  '[class*="PostCard"]',
  '[class*="post-card"]',
  '[class*="Card__"]',
  '[class*="card-item"]',
  '[class*="feed-item"]',
  '[class*="news-item"]',
  '[class*="article-item"]',
  '[class*="story-item"]',
  '[class*="listing-item"]',
  '.article',
  '.story',
  '.post',
  '.news-item',
  '.card',
];

function isArticleUrl(url: string): boolean {
  if (!url || url.length < 10) return false;
  if (SKIP_URL_PATTERNS.some((p) => p.test(url))) return false;

  // Matches known article URL patterns
  if (ARTICLE_URL_PATTERNS.some((p) => p.test(url))) return true;

  // Has a slug-like last segment (3+ hyphenated words)
  try {
    const path = new URL(url).pathname;
    const segments = path.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || '';
    if (lastSegment.split('-').length >= 3 && lastSegment.length > 15) return true;
  } catch {
    // not a valid URL
  }

  return false;
}

function parseFlexibleDate(dateStr: string): Date | undefined {
  if (!dateStr) return undefined;

  // ISO / standard date
  const d = new Date(dateStr);
  if (!isNaN(d.getTime()) && d.getFullYear() > 2000) return d;

  // Relative time: "2 hours ago", "3 days ago"
  const relMatch = dateStr.match(
    /(\d+)\s*(second|minute|min|hour|hr|day|week|month|year)s?\s*ago/i
  );
  if (relMatch) {
    const amount = parseInt(relMatch[1]);
    const unit = relMatch[2].toLowerCase();
    const ms: Record<string, number> = {
      second: 1000,
      minute: 60000,
      min: 60000,
      hour: 3600000,
      hr: 3600000,
      day: 86400000,
      week: 604800000,
      month: 2592000000,
      year: 31536000000,
    };
    return new Date(Date.now() - amount * (ms[unit] || 0));
  }

  // Ordinal dates: "23rd Nov 2025", "1st January 2024", "Feb 12, 2026"
  const ordinalMatch = dateStr.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s*,?\s*(\d{4})?/i
  );
  if (ordinalMatch) {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const day = parseInt(ordinalMatch[1]);
    const monthKey = ordinalMatch[2].toLowerCase().slice(0, 3);
    const year = ordinalMatch[3] ? parseInt(ordinalMatch[3]) : new Date().getFullYear();
    return new Date(year, months[monthKey], day);
  }

  return undefined;
}

// --- Strategy 1: JSON-LD ---

function extractJsonLdItems(data: unknown): Record<string, unknown>[] {
  if (!data || typeof data !== 'object') return [];

  if (Array.isArray(data)) {
    return data.flatMap(extractJsonLdItems);
  }

  const obj = data as Record<string, unknown>;

  // ItemList
  if (obj['@type'] === 'ItemList' && Array.isArray(obj.itemListElement)) {
    return (obj.itemListElement as Record<string, unknown>[])
      .map((item) => (item.item as Record<string, unknown>) || item)
      .filter(Boolean);
  }

  // Direct article types
  const articleTypes = ['NewsArticle', 'Article', 'BlogPosting', 'WebPage', 'ReportageNewsArticle'];
  const type = obj['@type'];
  if (typeof type === 'string' && articleTypes.includes(type)) {
    return [obj];
  }
  // Type can also be an array
  if (Array.isArray(type) && type.some((t) => articleTypes.includes(t))) {
    return [obj];
  }

  // @graph
  if (Array.isArray(obj['@graph'])) {
    return (obj['@graph'] as unknown[]).flatMap(extractJsonLdItems);
  }

  return [];
}

function extractFromJsonLd(html: string, pageUrl: string): ScrapedArticle[] {
  const $ = cheerio.load(html);
  const articles: ScrapedArticle[] = [];
  const baseUrl = new URL(pageUrl).origin;

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '');
      const items = extractJsonLdItems(data);

      for (const item of items) {
        const title = ((item.headline || item.name || '') as string).trim();
        if (title.length < 10) continue;

        const mainEntity = item.mainEntityOfPage as Record<string, string> | string | undefined;
        const rawUrl = (item.url || (typeof mainEntity === 'object' ? mainEntity['@id'] : mainEntity) || '') as string;
        const sourceUrl = normalizeUrl(rawUrl, baseUrl);
        if (!sourceUrl) continue;

        const image = item.image;
        let imageUrl = '';
        if (typeof image === 'string') imageUrl = image;
        else if (Array.isArray(image)) imageUrl = (typeof image[0] === 'string' ? image[0] : (image[0] as Record<string, string>)?.url) || '';
        else if (image && typeof image === 'object') imageUrl = (image as Record<string, string>).url || '';

        const author = item.author;
        let authorName: string | undefined;
        if (typeof author === 'string') authorName = author;
        else if (Array.isArray(author)) authorName = (author[0] as Record<string, string>)?.name;
        else if (author && typeof author === 'object') authorName = (author as Record<string, string>).name;

        articles.push({
          title,
          summary: ((item.description || '') as string).trim() || undefined,
          sourceUrl,
          imageUrl: normalizeUrl(imageUrl, baseUrl) || undefined,
          author: authorName,
          publishedAt: item.datePublished ? new Date(item.datePublished as string) : undefined,
        });
      }
    } catch {
      // invalid JSON-LD, skip
    }
  });

  return articles;
}

// --- Strategy 2: __NEXT_DATA__ (Next.js Pages Router) ---

function findArticleArrays(obj: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 6 || !obj) return [];

  if (Array.isArray(obj)) {
    const hasArticles = obj.some(
      (item) =>
        item &&
        typeof item === 'object' &&
        ('title' in item || 'headline' in item) &&
        ('slug' in item || 'url' in item || 'sourceUrl' in item || 'link' in item || 'path' in item)
    );
    if (hasArticles) {
      return obj.filter(
        (item) => item && typeof item === 'object' && ('title' in item || 'headline' in item)
      ) as Record<string, unknown>[];
    }
  }

  if (typeof obj === 'object' && obj !== null) {
    for (const value of Object.values(obj)) {
      const result = findArticleArrays(value, depth + 1);
      if (result.length > 0) return result;
    }
  }

  return [];
}

function extractFromNextData(html: string, pageUrl: string): ScrapedArticle[] {
  const $ = cheerio.load(html);
  const articles: ScrapedArticle[] = [];
  const baseUrl = new URL(pageUrl).origin;

  const nextDataScript = $('script#__NEXT_DATA__').html();
  if (!nextDataScript) return articles;

  try {
    const data = JSON.parse(nextDataScript);
    const props = data?.props?.pageProps;
    if (!props) return articles;

    const candidates = findArticleArrays(props);
    for (const item of candidates) {
      const title = ((item.title || item.headline || item.name || '') as string).trim();
      if (title.length < 10) continue;

      const slug = (item.slug || '') as string;
      let sourceUrl = (item.url || item.sourceUrl || item.link || item.path || '') as string;
      if (!sourceUrl && slug) {
        sourceUrl = `${baseUrl}/${slug}`;
      }
      sourceUrl = normalizeUrl(sourceUrl, baseUrl);
      if (!sourceUrl) continue;

      const metadata = item.metadata as Record<string, unknown> | undefined;

      articles.push({
        title,
        summary:
          ((item.summary || item.subtitle || item.excerpt || item.description || metadata?.excerpt || '') as string).trim() ||
          undefined,
        sourceUrl,
        imageUrl:
          normalizeUrl(
            (item.imageUrl || item.image || item.thumbnail || metadata?.media || metadata?.thumbnail || '') as string,
            baseUrl
          ) || undefined,
        author: (item.author as Record<string, string>)?.name || (metadata?.authors as Record<string, string>[])?.[0]?.name,
        publishedAt: (item.publishedAt || item.datePublished)
          ? new Date((item.publishedAt || item.datePublished) as string)
          : undefined,
      });
    }
  } catch {
    // invalid JSON
  }

  return articles;
}

// --- Strategy 3: Next.js RSC payload ---

function extractFromRscPayload(html: string, pageUrl: string): ScrapedArticle[] {
  const articles: ScrapedArticle[] = [];
  const baseUrl = new URL(pageUrl).origin;
  const seenUrls = new Set<string>();

  const $ = cheerio.load(html);
  const chunks: string[] = [];

  $('script').each((_, el) => {
    const content = $(el).html() || '';
    if (!content.includes('self.__next_f.push')) return;

    const rscPattern = /self\.__next_f\.push\(\[1,"(.+?)"\]\)/g;
    let match;
    while ((match = rscPattern.exec(content)) !== null) {
      try {
        const unescaped = match[1]
          .replace(/\\"/g, '"')
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\');
        chunks.push(unescaped);
      } catch {
        // skip malformed chunks
      }
    }
  });

  if (chunks.length === 0) return articles;

  const combined = chunks.join('');

  // Look for objects with title + slug + publishedAt
  const articlePattern =
    /"title"\s*:\s*"([^"]{10,300})"[^}]{0,500}?"slug"\s*:\s*"([^"]{3,200})"[^}]{0,500}?"publishedAt"\s*:\s*"([^"]+)"/g;
  let match;
  while ((match = articlePattern.exec(combined)) !== null) {
    const title = match[1].trim();
    const slug = match[2].trim();
    const publishedAt = match[3];

    if (title.length < 10) continue;

    // Build URL from slug using date
    let sourceUrl = '';
    if (publishedAt) {
      const date = new Date(publishedAt);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        sourceUrl = `${baseUrl}/${year}/${month}/${slug}`;
      }
    }
    if (!sourceUrl) {
      sourceUrl = `${baseUrl}/${slug}`;
    }

    if (seenUrls.has(sourceUrl)) continue;
    seenUrls.add(sourceUrl);

    // Find subtitle/excerpt/image near the title in the combined data
    const titleIndex = combined.indexOf(`"title":"${match[1]}"`);
    let summary: string | undefined;
    let imageUrl: string | undefined;

    if (titleIndex !== -1) {
      const context = combined.substring(titleIndex, titleIndex + 3000);
      const subtitleMatch = context.match(/"(?:subtitle|excerpt)"\s*:\s*"([^"]{20,300})"/);
      summary = subtitleMatch?.[1];

      const mediaMatch = context.match(/"(?:media|thumbnail|image)"\s*:\s*"(https?:\/\/[^"]+)"/);
      imageUrl = mediaMatch?.[1];
    }

    articles.push({
      title,
      summary,
      sourceUrl,
      imageUrl,
      publishedAt: new Date(publishedAt),
    });
  }

  return articles;
}

// --- Strategy 4: Smart HTML heuristics ---

function extractFromHtml(html: string, pageUrl: string): ScrapedArticle[] {
  const $ = cheerio.load(html);
  const articles: ScrapedArticle[] = [];
  const baseUrl = new URL(pageUrl).origin;
  const seenUrls = new Set<string>();

  // Try each container selector
  for (const selector of CONTAINER_SELECTORS) {
    let elements;
    try {
      elements = $(selector);
    } catch {
      continue; // invalid selector for this parser
    }
    if (elements.length < 2) continue; // need at least 2 for a list

    elements.each((_, el) => {
      const $el = $(el);

      // Find article link
      let articleUrl = '';
      let titleFromLink = '';

      $el.find('a[href]').each((_, linkEl) => {
        const href = $(linkEl).attr('href') || '';
        const resolved = normalizeUrl(href, baseUrl);
        if (isArticleUrl(resolved) && resolved !== pageUrl) {
          articleUrl = resolved;
          const linkText = $(linkEl).text().trim();
          if (linkText.length >= 10 && linkText.length < 300) {
            titleFromLink = linkText;
          }
          return false; // break
        }
      });

      if (!articleUrl || seenUrls.has(articleUrl)) return;

      // Find title: try link text, headings, title-class elements
      let title = titleFromLink;
      if (!title || title.length < 10) {
        const heading = $el.find('h1, h2, h3, h4, h5, h6').first();
        title = heading.text().trim();
      }
      if (!title || title.length < 10) {
        const titleEl = $el
          .find('[class*="title" i], [class*="Title"], [class*="headline" i], [class*="Headline"]')
          .first();
        title = titleEl.text().trim();
      }
      if (!title || title.length < 10) return;

      seenUrls.add(articleUrl);

      // Extract summary
      let summary: string | undefined;
      const summaryEl = $el
        .find(
          'p, [class*="summary" i], [class*="Summary"], [class*="excerpt" i], [class*="Excerpt"], [class*="description" i], [class*="Description"], [class*="subtitle" i], [class*="Subtitle"]'
        )
        .first();
      const summaryText = summaryEl.text().trim();
      if (summaryText && summaryText.length > 20 && summaryText !== title) {
        summary = summaryText.substring(0, 300);
      }

      // Extract image
      let imageUrl: string | undefined;
      const img = $el.find('img').first();
      const imgSrc =
        img.attr('data-src') ||
        img.attr('data-url') ||
        img.attr('data-lazy-src') ||
        img.attr('data-original') ||
        img.attr('src') ||
        '';
      if (imgSrc && !imgSrc.startsWith('data:') && !imgSrc.includes('placeholder') && !imgSrc.includes('grey_bg')) {
        imageUrl = normalizeUrl(imgSrc, baseUrl);
      }

      // Extract date
      let publishedAt: Date | undefined;
      const dateEl = $el
        .find('time, [class*="date" i], [class*="Date"], [class*="time" i], [class*="Time"], [class*="Caption"]')
        .first();
      const dateStr = dateEl.attr('datetime') || dateEl.text().trim();
      if (dateStr) {
        publishedAt = parseFlexibleDate(dateStr);
      }

      articles.push({
        title,
        summary,
        sourceUrl: articleUrl,
        imageUrl,
        publishedAt,
      });
    });

    if (articles.length >= 3) break; // found enough with this selector
  }

  // Last resort: link analysis
  if (articles.length === 0) {
    return extractFromLinks($, baseUrl, pageUrl, seenUrls);
  }

  return articles;
}

// --- Strategy 5: Link analysis (last resort) ---

function extractFromLinks(
  $: cheerio.CheerioAPI,
  baseUrl: string,
  pageUrl: string,
  seenUrls: Set<string>
): ScrapedArticle[] {
  const articles: ScrapedArticle[] = [];

  $('a[href]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    const resolved = normalizeUrl(href, baseUrl);

    if (!isArticleUrl(resolved) || seenUrls.has(resolved) || resolved === pageUrl) return;

    const text = $el.text().trim();
    if (text.length < 15 || text.length > 300) return;
    if (text.split(/\s+/).length < 3) return; // need at least 3 words

    seenUrls.add(resolved);

    // Try to find image nearby
    let imageUrl: string | undefined;
    const parentEl = $el.closest('div, li, section');
    if (parentEl.length) {
      const img = parentEl.find('img').first();
      if (img.length) {
        const src = img.attr('data-src') || img.attr('data-url') || img.attr('src') || '';
        if (src && !src.startsWith('data:')) {
          imageUrl = normalizeUrl(src, baseUrl);
        }
      }
    }

    articles.push({
      title: text,
      sourceUrl: resolved,
      imageUrl,
    });
  });

  return articles;
}

// --- Main entry point ---

export function autoDetectArticles(html: string, pageUrl: string): ScrapedArticle[] {
  // Strategy 1: JSON-LD (most reliable, structured data)
  let articles = extractFromJsonLd(html, pageUrl);
  if (articles.length >= 2) {
    console.log(`[AutoDetect] Found ${articles.length} articles via JSON-LD`);
    return articles;
  }

  // Strategy 2: __NEXT_DATA__ (Next.js Pages Router)
  articles = extractFromNextData(html, pageUrl);
  if (articles.length >= 2) {
    console.log(`[AutoDetect] Found ${articles.length} articles via __NEXT_DATA__`);
    return articles;
  }

  // Strategy 3: RSC payload (Next.js App Router)
  articles = extractFromRscPayload(html, pageUrl);
  if (articles.length >= 2) {
    console.log(`[AutoDetect] Found ${articles.length} articles via RSC payload`);
    return articles;
  }

  // Strategy 4: Smart HTML heuristics + link analysis
  articles = extractFromHtml(html, pageUrl);
  if (articles.length > 0) {
    console.log(`[AutoDetect] Found ${articles.length} articles via HTML heuristics`);
  } else {
    console.log(`[AutoDetect] No articles found with any strategy for ${pageUrl}`);
  }

  return articles;
}
