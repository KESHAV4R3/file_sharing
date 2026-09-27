import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import FileModel from '@/lib/models/File';
import { getAuthUser } from '@/lib/auth';
import cloudinary from '@/lib/cloudinary';
import mongoose from 'mongoose';

const MIME_MAP: Record<string, string> = {
  pdf:   'application/pdf',
  txt:   'text/plain; charset=utf-8',
  html:  'text/html; charset=utf-8',
  csv:   'text/csv; charset=utf-8',
  image: 'image/jpeg',
  video: 'video/mp4',
  audio: 'audio/mpeg',
};

async function tryFetch(url: string): Promise<Response | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (res.ok) return res;
    return null;
  } catch {
    return null;
  }
}

function buildSignedUrl(
  publicId: string,
  resourceType: 'image' | 'raw' | 'video',
  deliveryType: 'upload' | 'authenticated'
): string {
  const expireAt = Math.floor(Date.now() / 1000) + 300;
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: deliveryType,
    sign_url: true,
    expires_at: expireAt,
    secure: true,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const { id } = await params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid file ID.' }, { status: 400 });
    }

    await connectToDatabase();

    const file = await FileModel.findById(id).lean();

    if (!file) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    const isMedia = (file as any).fileType === 'video' || (file as any).fileType === 'audio';
    if (!isMedia && (file as any).userId.toString() !== authUser.userId) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    const cloudinaryUrl: string = (file as any).cloudinaryUrl;
    const publicId: string     = (file as any).cloudinaryPublicId;
    const fileType: string     = (file as any).fileType || 'pdf';

    if (!cloudinaryUrl) {
      return NextResponse.json({ error: 'No Cloudinary URL for this file.' }, { status: 404 });
    }

    // ── Fetch strategy cascade ──────────────────────────────────────────────
    // 1. Direct stored URL (works for public assets)
    // 2-5. Signed URLs covering all resource_type × delivery_type combos
    //      (covers assets stored as authenticated / raw / image / video)
    let upstream: Response | null = await tryFetch(cloudinaryUrl);

    if (!upstream && publicId) {
      const candidates: Array<[string, string]> = [
        // [resource_type, delivery_type]
        ['video', 'upload'],
        ['video', 'authenticated'],
        ['image', 'authenticated'],
        ['image', 'upload'],
        ['raw',   'authenticated'],
        ['raw',   'upload'],
      ];
      for (const [rt, dt] of candidates) {
        const signed = buildSignedUrl(publicId, rt as 'image' | 'raw' | 'video', dt as 'upload' | 'authenticated');
        upstream = await tryFetch(signed);
        if (upstream) break;
      }
    }

    if (!upstream) {
      return NextResponse.json(
        {
          error:
            'Could not retrieve this file from Cloudinary. Go to the Upload tab and click "Fix Existing Files" to repair access, then try again.',
        },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get('content-type') || MIME_MAP[fileType] || 'application/octet-stream';
    const body        = upstream.body;
    if (!body) {
      return NextResponse.json({ error: 'Empty response from Cloudinary.' }, { status: 502 });
    }

    const originalName: string = (file as any).originalName ?? 'file';

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type':        contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(originalName)}"`,
        'Cache-Control':       'private, max-age=300',
      },
    });
  } catch (error: any) {
    console.error('Raw file proxy error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to proxy file.' }, { status: 500 });
  }
}
