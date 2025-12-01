const multer = require('multer');
const path = require('path');
const fs = require('fs');
const b2Cache = require('./b2Cache');

// Function to sanitize filenames by removing special characters
const sanitizeFileName = (fileName) => {
  return fileName
    // Normalize Unicode characters to decomposed form (NFD)
    .normalize('NFD')
    // Remove diacritics (accent marks) - keeps base characters, removes accents
    .replace(/[\u0300-\u036f]/g, '')
    // Replace remaining special characters with underscores
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    // Clean up multiple underscores
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '');
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    // Sanitize the filename to remove special characters
    const sanitizedName = sanitizeFileName(file.originalname);
    console.log('📝 [MULTER] Filename sanitization:', {
      original: file.originalname,
      sanitized: sanitizedName,
      hadSpecialChars: file.originalname !== sanitizedName
    });
    cb(null, Date.now() + '-' + sanitizedName);
  }
});

// Create multer instance with progress tracking
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

const uploadToBackblaze = async (file, userId) => {
  try {
    await b2Cache.authorize();
    const b2 = b2Cache.getB2Instance();

    let finalFileName;
    
    // Check if we have a filename from multer (avoids double timestamps)
    if (file.filename) {
      // Use the filename that multer already created (already sanitized and timestamped)
      const baseFileName = path.parse(file.filename).name;
      finalFileName = `${baseFileName}.aac`;
    } else {
      // Fallback: Generate new filename with sanitization (for manual uploads)
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const originalFileName = path.basename(file.originalname, path.extname(file.originalname));
      const sanitizedFileName = sanitizeFileName(originalFileName);
      const fileExtension = path.extname(file.originalname);
      finalFileName = `${uniqueSuffix}-${sanitizedFileName}${fileExtension}`;
    }

    // Define the file path with folders
    const filePath = `audio/users/${userId}/${finalFileName}`;

    // Get Upload URL
    const uploadUrlResponse = await b2.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID,
    });
    const { uploadUrl, authorizationToken } = uploadUrlResponse.data;

    // Read the file buffer
    const fileBuffer = fs.readFileSync(file.path);

    // Upload File
    const uploadResponse = await b2.uploadFile({
      uploadUrl,
      uploadAuthToken: authorizationToken,
      fileName: filePath,
      data: fileBuffer,
    });

    if (!uploadResponse.data) {
      throw new Error('Response data is undefined');
    }

    // Return only the file name
    return finalFileName;
  } catch (error) {
    console.error('Error uploading to Backblaze:', error);
    throw error;
  }
};

module.exports = { upload, uploadToBackblaze };