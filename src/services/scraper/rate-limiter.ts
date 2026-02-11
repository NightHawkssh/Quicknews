import { extractDomain, sleep } from '@/lib/utils';

interface DomainState {
  lastRequest: number;
  rateLimit: number;
}

class RateLimiter {
  private domains: Map<string, DomainState> = new Map();
  private defaultRateLimit = 2000; // 2 seconds default

  setRateLimit(url: string, rateLimit: number): void {
    const domain = extractDomain(url);
    const existing = this.domains.get(domain);
    this.domains.set(domain, {
      lastRequest: existing?.lastRequest ?? 0,
      rateLimit,
    });
  }

  async waitForSlot(url: string): Promise<void> {
    const domain = extractDomain(url);
    const state = this.domains.get(domain) ?? {
      lastRequest: 0,
      rateLimit: this.defaultRateLimit,
    };

    const now = Date.now();
    const timeSinceLastRequest = now - state.lastRequest;
    const waitTime = Math.max(0, state.rateLimit - timeSinceLastRequest);

    if (waitTime > 0) {
      await sleep(waitTime);
    }

    this.domains.set(domain, {
      ...state,
      lastRequest: Date.now(),
    });
  }

  reset(): void {
    this.domains.clear();
  }
}

export const rateLimiter = new RateLimiter();
export default rateLimiter;
