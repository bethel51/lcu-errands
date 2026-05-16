import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a Buffer to Cloudinary.
 * @param {Buffer} buffer – file data from Multer memory storage
 * @param {string} folder – optional folder name inside Cloudinary
 * @returns {Promise<string>} – secure URL
 */
export const uploadToCloudinary = (buffer, folder = "leadcity_errands") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      },
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};
