const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

/**
 * Uploads a memory buffer to Cloudinary
 * @param {Buffer} buffer 
 * @param {String} folder 
 * @returns {Promise<{url: String, publicId: String}>}
 */
const uploadBufferToCloudinary = (buffer, folder = 'citymind/complaints') => {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      // Graceful fallback if Cloudinary credentials are not set in .env during local testing
      const base64Data = buffer.toString('base64');
      const fallbackUrl = `data:image/jpeg;base64,${base64Data}`;
      const fallbackPublicId = `citymind_local_${Date.now()}`;
      return resolve({
        url: fallbackUrl,
        publicId: fallbackPublicId
      });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

module.exports = {
  cloudinary,
  uploadBufferToCloudinary,
};
