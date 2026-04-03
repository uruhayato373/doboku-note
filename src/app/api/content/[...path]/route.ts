import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;

  // Only serve from .local/r2/content in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }

  const filePath = path.join(
    process.cwd(),
    '.local',
    'r2',
    'content',
    ...pathSegments
  );

  // Prevent path traversal
  const resolvedPath = path.resolve(filePath);
  const baseDir = path.resolve(process.cwd(), '.local', 'r2', 'content');

  if (!resolvedPath.startsWith(baseDir)) {
    return NextResponse.json(
      { error: 'Access denied' },
      { status: 403 }
    );
  }

  try {
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404 }
      );
    }

    const fileContents = fs.readFileSync(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(fileContents, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
