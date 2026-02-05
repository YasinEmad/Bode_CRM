/**
 * Alternative API Implementation for GridFS Image Storage
 * File: src/app/api/deal-closing/upload-to-gridfs/route.ts
 * 
 * This is an example implementation if storing images in MongoDB using GridFS
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import mongoose from 'mongoose';
import { verify } from 'jsonwebtoken';
import sharp from 'sharp'; // For image compression

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface TokenPayload {
  userId: string;
  email?: string;
  role?: string;
}

/**
 * Upload image to GridFS instead of ImageKit
 * POST /api/deal-closing/upload-to-gridfs
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verify(token, JWT_SECRET) as TokenPayload;

    await connectDB();

    const formData = await req.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    const uploadedFiles: Array<{
      fileId: string;
      originalName: string;
      size: number;
      contentType: string;
    }> = [];

    // Get GridFS bucket
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    const bucket = new mongoose.mongo.GridFSBucket(db);

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        continue; // Skip non-image files
      }

      // Validate file size (max 5MB per image)
      if (file.size > 5 * 1024 * 1024) {
        console.warn(`File ${file.name} exceeds 5MB limit`);
        continue;
      }

      try {
        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Compress image if it's large (optional but recommended)
        let compressedBuffer = buffer;
        let compressedSize = buffer.length;

        if (file.type === 'image/jpeg' || file.type === 'image/png') {
          try {
            compressedBuffer = await sharp(buffer)
              .resize(1920, 1080, {
                fit: 'inside',
                withoutEnlargement: true,
              })
              .jpeg({ quality: 80 })
              .toBuffer();
            compressedSize = compressedBuffer.length;
          } catch (compressError) {
            console.error('Image compression failed, using original:', compressError);
            compressedBuffer = buffer;
            compressedSize = buffer.length;
          }
        }

        // Upload to GridFS
        const uploadStream = bucket.openUploadStream(file.name, {
          contentType: file.type,
          metadata: {
            uploadedBy: decoded.userId,
            uploadedAt: new Date(),
            originalSize: buffer.length,
            compressedSize,
          },
        });

        uploadStream.end(compressedBuffer);

        await new Promise((resolve, reject) => {
          uploadStream.on('finish', resolve);
          uploadStream.on('error', reject);
        });

        uploadedFiles.push({
          fileId: uploadStream.id.toString(),
          originalName: file.name,
          size: compressedSize,
          contentType: file.type,
        });

        console.log(`[GridFS] Uploaded: ${file.name} (${compressedSize} bytes)`);
      } catch (error) {
        console.error(`Failed to upload file ${file.name}:`, error);
      }
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: 'No files were uploaded successfully' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
      count: uploadedFiles.length,
    });
  } catch (error) {
    console.error('Error uploading to GridFS:', error);
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}

/**
 * Download image from GridFS
 * GET /api/deal-closing/download-gridfs/[fileId]
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const fileId = url.searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }
    const bucket = new mongoose.mongo.GridFSBucket(db);

    // Check if file exists
    const files = await db.collection('fs.files').find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
    if (files.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const file = files[0];
    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));

    // Collect stream data
    const chunks: Buffer[] = [];
    await new Promise((resolve, reject) => {
      downloadStream.on('data', (chunk) => chunks.push(chunk));
      downloadStream.on('end', resolve);
      downloadStream.on('error', reject);
    });

    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': file.contentType || 'application/octet-stream',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Error downloading from GridFS:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}

// ============================================
// Storage Calculation Utilities
// ============================================

/**
 * Calculate GridFS storage requirements
 * Usage: For monitoring and capacity planning
 */
export async function calculateGridFSSize() {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return null;

    const fsFiles = await db.collection('fs.files').find({}).toArray();
    const fsChunks = await db.collection('fs.chunks').find({}).toArray();

    const totalSize = fsFiles.reduce((sum, file) => sum + (file.length || 0), 0);
    const chunkCount = fsChunks.length;

    return {
      fileCount: fsFiles.length,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      chunkCount,
      averageFileSize: (totalSize / fsFiles.length / 1024).toFixed(2) + ' KB',
    };
  } catch (error) {
    console.error('Error calculating GridFS size:', error);
    return null;
  }
}

/**
 * Cleanup old/orphaned GridFS files
 * Usage: Periodic maintenance to clean up space
 */
export async function cleanupOrphanedFiles() {
  try {
    await connectDB();
    const db = mongoose.connection.db;
    if (!db) return null;

    // Get all file IDs that are referenced in DealClosing documents
    const referencedFileIds = await db.collection('dealclosings').aggregate([
      { $unwind: '$attachments' },
      { $group: { _id: '$attachments.fileId' } },
    ]).toArray();

    const referencedIds = new Set(
      referencedFileIds.map((doc: any) => doc._id.toString())
    );

    // Find files in GridFS that are not referenced
    const allGridFSFiles = await db.collection('fs.files').find({}).toArray();
    const orphanedFiles = allGridFSFiles.filter(
      (file: any) => !referencedIds.has(file._id.toString())
    );

    if (orphanedFiles.length === 0) {
      return { deletedCount: 0, freedSpaceBytes: 0 };
    }

    // Delete orphaned files
    const orphanedIds = orphanedFiles.map((f: any) => f._id);
    const bucket = new mongoose.mongo.GridFSBucket(db);

    let freedSpace = 0;
    for (const fileId of orphanedIds) {
      const fileInfo = allGridFSFiles.find((f: any) => f._id.equals(fileId));
      if (fileInfo) {
        freedSpace += fileInfo.length;
        await bucket.delete(fileId);
      }
    }

    return {
      deletedCount: orphanedIds.length,
      freedSpaceBytes: freedSpace,
      freedSpaceMB: (freedSpace / (1024 * 1024)).toFixed(2),
    };
  } catch (error) {
    console.error('Error cleaning up orphaned files:', error);
    return null;
  }
}
