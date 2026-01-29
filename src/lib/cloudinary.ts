import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryUploadResult } from '@/types';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Upload video to Cloudinary
export async function uploadVideo(
  filePath: string,
  folder: string = 'courses',
  publicId?: string
): Promise<CloudinaryUploadResult> {
  try {
    const uploadOptions: any = {
      resource_type: 'video',
      folder: `logictradersltd/${folder}`,
      eager: [
        { streaming_profile: 'hd', format: 'm3u8' }, // HLS streaming
      ],
      eager_async: true,
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      format: result.format,
      duration: result.duration,
      bytes: result.bytes,
    };
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload video: ${error.message}`);
  }
}

// Upload image (thumbnail)
export async function uploadImage(
  filePath: string,
  folder: string = 'thumbnails',
  publicId?: string
): Promise<CloudinaryUploadResult> {
  try {
    const uploadOptions: any = {
      resource_type: 'image',
      folder: `logictradersltd/${folder}`,
      transformation: [
        { width: 1280, height: 720, crop: 'limit' },
        { quality: 'auto:good' },
      ],
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

// Generate signed URL for secure video access
export function generateSignedVideoUrl(
  publicId: string,
  expiresIn: number = 3600 // 1 hour default
): string {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000) + expiresIn;
    
    const signature = cloudinary.utils.api_sign_request(
      {
        public_id: publicId,
        timestamp: timestamp,
      },
      process.env.CLOUDINARY_API_SECRET as string
    );

    return cloudinary.url(publicId, {
      resource_type: 'video',
      sign_url: true,
      secure: true,
      signature: signature,
      timestamp: timestamp,
    });
  } catch (error: any) {
    console.error('Cloudinary signed URL error:', error);
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }
}

// Generate streaming URL (HLS)
export function generateStreamingUrl(publicId: string): string {
  try {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      streaming_profile: 'hd',
      format: 'm3u8',
      secure: true,
    });
  } catch (error: any) {
    console.error('Cloudinary streaming URL error:', error);
    throw new Error(`Failed to generate streaming URL: ${error.message}`);
  }
}

// Delete video from Cloudinary
export async function deleteVideo(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
  } catch (error: any) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete video: ${error.message}`);
  }
}

// Delete image from Cloudinary
export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (error: any) {
    console.error('Cloudinary delete error:', error);
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

// Get video info
export async function getVideoInfo(publicId: string): Promise<any> {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'video',
    });
    return result;
  } catch (error: any) {
    console.error('Cloudinary get info error:', error);
    throw new Error(`Failed to get video info: ${error.message}`);
  }
}

// Transform video URL for different qualities
export function getVideoUrlWithTransformation(
  publicId: string,
  quality: 'low' | 'medium' | 'high' = 'medium'
): string {
  const transformations: Record<string, any> = {
    low: { width: 640, quality: 'auto:low' },
    medium: { width: 1280, quality: 'auto:good' },
    high: { width: 1920, quality: 'auto:best' },
  };

  try {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      transformation: [transformations[quality]],
      secure: true,
    });
  } catch (error: any) {
    console.error('Cloudinary transformation error:', error);
    throw new Error(`Failed to transform video: ${error.message}`);
  }
}

// Generate thumbnail from video
export function generateVideoThumbnail(publicId: string, time: string = '0'): string {
  try {
    return cloudinary.url(publicId, {
      resource_type: 'video',
      transformation: [
        { width: 1280, height: 720, crop: 'limit' },
      ],
      secure: true,
    });
  } catch (error: any) {
    console.error('Cloudinary thumbnail error:', error);
    throw new Error(`Failed to generate thumbnail: ${error.message}`);
  }
}

export default cloudinary;
