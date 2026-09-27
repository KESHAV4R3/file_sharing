import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import CodeFileModel, { ICodeFile } from '@/lib/models/CodeFile';
import { getAuthUser } from '@/lib/auth';
import mongoose from 'mongoose';

export function detectLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'java':
      return 'java';
    case 'py':
    case 'python':
      return 'python';
    case 'js':
    case 'jsx':
    case 'mjs':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'c':
      return 'c';
    case 'cpp':
    case 'cc':
    case 'cxx':
    case 'h':
    case 'hpp':
      return 'cpp';
    case 'cs':
      return 'csharp';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
    case 'scss':
      return 'css';
    case 'json':
      return 'json';
    case 'sql':
      return 'sql';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'md':
      return 'markdown';
    case 'txt':
      return 'plaintext';
    default:
      return ext || 'plaintext';
  }
}

export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(authUser.userId);

    const files = await CodeFileModel.find({ userId: userObjectId })
      .sort({ updatedAt: -1 })
      .lean<ICodeFile[]>();

    const formattedFiles = files.map((f) => ({
      id: (f._id as mongoose.Types.ObjectId).toString(),
      fileName: f.fileName,
      language: f.language || detectLanguage(f.fileName),
      content: f.content || '',
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    return NextResponse.json({ files: formattedFiles });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch code files.';
    console.error('Fetch code files error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const userObjectId = new mongoose.Types.ObjectId(authUser.userId);

    const body = await request.json().catch(() => ({}));
    let fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
    const content = typeof body.content === 'string' ? body.content : '';

    if (!fileName) {
      const count = await CodeFileModel.countDocuments({ userId: userObjectId });
      fileName = `script_${count + 1}.txt`;
    }

    const language = body.language || detectLanguage(fileName);

    const newCodeFile = await CodeFileModel.create({
      userId: userObjectId,
      fileName,
      language,
      content,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        file: {
          id: newCodeFile._id.toString(),
          fileName: newCodeFile.fileName,
          language: newCodeFile.language,
          content: newCodeFile.content,
          createdAt: newCodeFile.createdAt,
          updatedAt: newCodeFile.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create code file.';
    console.error('Create code file error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
