import multer from "multer";

// Use memory storage so we can forward the buffer to Cloudinary
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

/**
 * Middleware to handle single image uploads and keep backward compatibility
 * @param {string} folder - (Unused now, handled by controller)
 * @param {string} fieldName - The form field name
 */
export const uploadImage = (folder, fieldName = "image") => {
  return [
    upload.single(fieldName),
    (req, res, next) => {
      // In Cloudinary mode, we don't set req.body.imageUrl here
      // The controller will handle the upload and update the user/document
      next();
    },
  ];
};
