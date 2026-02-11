import axios, { AxiosError } from 'axios';
import { rateLimiter } from './rate-limiter';
import { sleep } from '@/lib/utils';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

interface FetchOptions {
  maxRetries?: number;
  timeout?: number;
  rateLimit?: number;
}

export async function fetchPage(
  url: string,
  options: FetchOptions = {}
): Promise<string> {
  const { maxRetries = 3, timeout = 30000, rateLimit } = options;

  if (rateLimit) {
    rateLimiter.setRateLimit(url, rateLimit);
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await rateLimiter.waitForSlot(url);

      const response = await axios.get(url, {
        timeout,
        headers: {
          'User-Agent': getRandomUserAgent(),
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Cache-Control': 'max-age=0',
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 500,
      });

      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.data;
    } catch (error) {
      lastError = error as Error;

      if (error instanceof AxiosError) {
        // Don't retry on client errors (except 429 rate limit)
        if (error.response?.status && error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429) {
          throw new Error(`HTTP ${error.response.status}: ${error.response.statusText || 'Client Error'}`);
        }
      }

      if (attempt < maxRetries) {
        // Exponential backoff
        const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`Retry ${attempt}/${maxRetries} for ${url} after ${backoffTime}ms`);
        await sleep(backoffTime);
      }
    }
  }

  throw new Error(`Failed to fetch ${url} after ${maxRetries} attempts: ${lastError?.message}`);
}

export async function fetchMultiplePages(
  urls: string[],
  options: FetchOptions = {}
): Promise<Map<string, string | Error>> {
  const results = new Map<string, string | Error>();

  for (const url of urls) {
    try {
      const html = await fetchPage(url, options);
      results.set(url, html);
    } catch (error) {
      results.set(url, error as Error);
    }
  }

  return results;
}
