import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
import streamifier from 'streamifier';

dotenv.config();

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup (stores file in memory for streaming to Cloudinary)
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for high-quality logos
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (JPEG, PNG, SVG, WebP, GIF)!'), false);
    }
  }
});

// Helper function to upload any buffer to Cloudinary with folder specification
const uploadBufferToCloudinary = (fileBuffer, folder = 'techblogai/featured-images', options = {}) => {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      folder,
      transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }],
    };
    
    const uploadOptions = { ...defaultOptions, ...options };
    
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// 1. Job/Company Logos Upload (optimized for logos)
const uploadJobLogoToCloudinary = (fileBuffer, companyName = '') => {
  const sanitizedName = companyName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const folder = `techblogai/job-logos/${sanitizedName || 'general'}`;
  
  return uploadBufferToCloudinary(fileBuffer, folder, {
    transformation: [
      { width: 400, height: 400, crop: 'pad', background: 'white' },
      { quality: 'auto:best' }
    ],
    allowed_formats: ['png', 'jpg', 'jpeg', 'svg', 'webp'],
    public_id_prefix: `logo-${Date.now()}-`
  });
};

// 2. Featured Images Upload (for blog posts)
const uploadFeaturedImageToCloudinary = (fileBuffer, postTitle = '') => {
  const sanitizedTitle = postTitle.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const folder = 'techblogai/featured-images';
  
  return uploadBufferToCloudinary(fileBuffer, folder, {
    transformation: [
      { width: 1200, height: 630, crop: 'fill', gravity: 'auto' },
      { quality: 'auto:good' }
    ],
    public_id_prefix: `featured-${sanitizedTitle || Date.now()}-`
  });
};

// 3. Partner Logos Upload (for advertise page)
const uploadPartnerLogoToCloudinary = (fileBuffer, partnerName = '') => {
  const sanitizedName = partnerName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const folder = 'techblogai/partner-logos';
  
  return uploadBufferToCloudinary(fileBuffer, folder, {
    transformation: [
      { width: 300, height: 150, crop: 'scale', background: 'transparent' },
      { quality: 'auto:best' }
    ],
    allowed_formats: ['png', 'jpg', 'jpeg', 'svg', 'webp'],
    public_id_prefix: `partner-${sanitizedName || Date.now()}-`
  });
};

// 4. User Avatars Upload (for comments/authors)
const uploadAvatarToCloudinary = (fileBuffer, userId = '') => {
  const folder = 'techblogai/user-avatars';
  
  return uploadBufferToCloudinary(fileBuffer, folder, {
    transformation: [
      { width: 200, height: 200, crop: 'thumb', gravity: 'face' },
      { radius: 'max' },
      { quality: 'auto:good' }
    ],
    public_id_prefix: `avatar-${userId || Date.now()}-`
  });
};

// 5. General Content Images (for post content)
const uploadContentImageToCloudinary = (fileBuffer, postId = '') => {
  const folder = `techblogai/content-images/${postId || 'general'}`;
  
  return uploadBufferToCloudinary(fileBuffer, folder, {
    transformation: [
      { width: 800, crop: 'limit' },
      { quality: 'auto:eco' }
    ]
  });
};

// 6. Ad Banner Images (for advertising)
const uploadAdBannerToCloudinary = (fileBuffer, adName = '') => {
  const sanitizedName = adName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const folder = 'techblogai/ad-banners';
  
  return uploadBufferToCloudinary(fileBuffer, folder, {
    transformation: [
      { width: 728, height: 90, crop: 'fill', gravity: 'center' }, // Leaderboard
      { quality: 'auto:good' }
    ],
    public_id_prefix: `ad-${sanitizedName || Date.now()}-`
  });
};

// 7. Document Upload (PDF, DOC - for media kits, resumes)
const uploadDocumentToCloudinary = (fileBuffer, fileName = '', resourceType = 'raw') => {
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '-').toLowerCase();
  const folder = 'techblogai/documents';
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: `doc-${sanitizedName || Date.now()}`,
        overwrite: false
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

// 8. Delete image from Cloudinary
const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true
    });
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

// 9. Batch upload for multiple images
const uploadMultipleToCloudinary = async (files, folder = 'techblogai/uploads', type = 'general') => {
  const uploadPromises = files.map((file, index) => {
    const options = {};
    
    switch (type) {
      case 'job-logos':
        options.transformation = [{ width: 400, height: 400, crop: 'pad' }];
        break;
      case 'featured':
        options.transformation = [{ width: 1200, height: 630, crop: 'fill' }];
        break;
      case 'gallery':
        options.transformation = [{ width: 800, crop: 'limit' }];
        break;
      default:
        options.transformation = [{ width: 1024, crop: 'limit' }];
    }
    
    return uploadBufferToCloudinary(file.buffer, `${folder}/${type}`, options);
  });
  
  return Promise.all(uploadPromises);
};

// 10. Get Cloudinary URL with transformations
const getOptimizedUrl = (publicId, options = {}) => {
  const defaultOptions = {
    width: 800,
    quality: 'auto',
    format: 'auto'
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  
  return cloudinary.url(publicId, {
    ...finalOptions,
    secure: true
  });
};

// Export all functions
export {
  cloudinary,
  parser,
  uploadBufferToCloudinary,
  uploadJobLogoToCloudinary,
  uploadFeaturedImageToCloudinary,
  uploadPartnerLogoToCloudinary,
  uploadAvatarToCloudinary,
  uploadContentImageToCloudinary,
  uploadAdBannerToCloudinary,
  uploadDocumentToCloudinary,
  deleteFromCloudinary,
  uploadMultipleToCloudinary,
  getOptimizedUrl
};

export const uploadToCloudinary = uploadBufferToCloudinary;