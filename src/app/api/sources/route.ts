import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const sources = await prisma.source.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    const formattedSources = sources.map((source) => ({
      ...source,
      selectors: JSON.parse(source.selectors),
      articleCount: source._count.articles,
    }));

    return NextResponse.json({
      success: true,
      data: formattedSources,
    });
  } catch (error) {
    console.error('Error fetching sources:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch sources',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, url, selectors, rateLimit = 2000, isActive = true } = body;

    if (!name || !url || !selectors) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, url, selectors',
        },
        { status: 400 }
      );
    }

    const source = await prisma.source.create({
      data: {
        name,
        url,
        selectors: JSON.stringify(selectors),
        rateLimit,
        isActive,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...source,
        selectors: JSON.parse(source.selectors),
      },
    });
  } catch (error) {
    console.error('Error creating source:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create source',
      },
      { status: 500 }
    );
  }
}
