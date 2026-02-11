import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const source = await prisma.source.findUnique({
      where: { id },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    if (!source) {
      return NextResponse.json(
        {
          success: false,
          error: 'Source not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...source,
        selectors: JSON.parse(source.selectors),
        articleCount: source._count.articles,
      },
    });
  } catch (error) {
    console.error('Error fetching source:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch source',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, url, selectors, rateLimit, isActive } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (selectors !== undefined) updateData.selectors = JSON.stringify(selectors);
    if (rateLimit !== undefined) updateData.rateLimit = rateLimit;
    if (isActive !== undefined) updateData.isActive = isActive;

    const source = await prisma.source.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...source,
        selectors: JSON.parse(source.selectors),
      },
    });
  } catch (error) {
    console.error('Error updating source:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update source',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.source.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error('Error deleting source:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete source',
      },
      { status: 500 }
    );
  }
}
