import { NextRequest, NextResponse } from 'next/server';
import { scrapeAllSources, scrapeSource, getScrapingStatus } from '@/services/scraper';

export async function GET() {
  try {
    const status = await getScrapingStatus();
    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error getting scraping status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get scraping status',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { sourceId } = body;

    let results;

    if (sourceId) {
      // Scrape single source
      const result = await scrapeSource(sourceId);
      results = [result];
    } else {
      // Scrape all active sources
      results = await scrapeAllSources();
    }

    const successCount = results.filter((r) => r.success).length;
    const totalArticles = results.reduce((acc, r) => acc + r.articlesCount, 0);

    return NextResponse.json({
      success: true,
      data: {
        results,
        summary: {
          sourcesScraped: results.length,
          sourcesSuccessful: successCount,
          totalArticles,
        },
      },
    });
  } catch (error) {
    console.error('Error during scraping:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to complete scraping',
      },
      { status: 500 }
    );
  }
}
