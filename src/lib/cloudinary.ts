import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  bytes?: number;
}

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  originalFilename: string,
  fileType: string
): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret || cloudName === 'xxxxx') {
    throw new Error('Cloudinary credentials are not properly configured in environment');
  }

  // Resource type mapping:
  // - 'video' : video AND audio (Cloudinary processes all audio as video resource_type)
  // - 'image' : images AND pdfs (Cloudinary natively serves PDFs as image resources
  //              with public delivery – using 'auto' or 'raw' makes them private)
  // - 'raw'   : txt, html, csv (plain text, publicly readable)
  let resourceType: 'video' | 'image' | 'raw';
  if (fileType === 'video' || fileType === 'audio') {
    resourceType = 'video';
  } else if (fileType === 'image' || fileType === 'pdf') {
    resourceType = 'image';
  } else {
    resourceType = 'raw';
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'doc_reader_files',
        resource_type: resourceType,
        // Ensure every asset is publicly accessible without signed URLs
        access_mode: 'public',
        use_filename: true,
        filename_override: originalFilename,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Upload to Cloudinary failed'));
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
          bytes: result.bytes,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

export async function deleteFromCloudinary(
  publicId: string,
  fileType?: string
): Promise<{ success: boolean; result?: string; error?: string }> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret || cloudName === 'xxxxx') {
    console.warn('Cloudinary credentials missing, skipping Cloudinary asset deletion');
    return { success: false, error: 'Cloudinary not configured' };
  }

  // Match the upload resource_type logic:
  // video/audio → 'video', pdf/image → 'image', txt/html/csv → 'raw'
  const primaryType: 'image' | 'raw' | 'video' =
    fileType === 'video' || fileType === 'audio'
      ? 'video'
      : fileType === 'image' || fileType === 'pdf'
      ? 'image'
      : 'raw';
  const allTypes: Array<'image' | 'raw' | 'video'> = ['video', 'image', 'raw'];
  const typesToTry: Array<'image' | 'raw' | 'video'> = [
    primaryType,
    ...allTypes.filter((t) => t !== primaryType),
  ];

  for (const resourceType of typesToTry) {
    try {
      const res = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true,
      });

      if (res && (res.result === 'ok' || res.result === 'not found')) {
        return { success: true, result: res.result };
      }
    } catch (err: any) {
      console.warn(`Cloudinary destroy attempt (${resourceType}) error:`, err?.message);
    }
  }

  return { success: false, error: 'Could not destroy Cloudinary asset' };
}

/**
 * Generate a short-lived signed delivery URL for a Cloudinary asset.
 * Useful as a fallback for existing DB entries that were stored as private/raw.
 */
export function generateSignedUrl(
  publicId: string,
  resourceType: 'image' | 'raw' | 'video' = 'image',
  expiresInSeconds = 300
): string {
  const expireAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: 'upload',
    sign_url: true,
    expires_at: expireAt,
    secure: true,
  });
}

export default cloudinary;
