import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const sourceId = searchParams.get('sourceId');

    const skip = (page - 1) * pageSize;

    const where = sourceId ? { sourceId } : {};

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        include: {
          source: {
            select: {
              id: true,
              name: true,
              url: true,
            },
          },
        },
        orderBy: [
          { publishedAt: 'desc' },
          { scrapedAt: 'desc' },
        ],
        skip,
        take: pageSize,
      }),
      prisma.article.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: articles,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch articles',
      },
      { status: 500 }
    );
  }
}
