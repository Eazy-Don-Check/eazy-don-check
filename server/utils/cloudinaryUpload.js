const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

/**
 * Upload a memory buffer to Cloudinary.
 *
 * @param {Buffer} buffer
 * @param {String} folder
 * @returns {Promise<Object>}
 */
const uploadToCloudinary = (buffer, folder = "eazy-check") => {
    return new Promise((resolve, reject) => {
        if (!buffer || !Buffer.isBuffer(buffer)) {
            return reject(
                new Error("Cloudinary upload failed: invalid image buffer.")
            );
        }

        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "image",
                overwrite: true,
                invalidate: true,
            },
            (error, result) => {
                if (error) {
                    console.error("==============================================");
                    console.error("❌ CLOUDINARY UPLOAD ERROR");
                    console.error("==============================================");
                    console.error("HTTP Status:", error.http_code || "Unknown");
                    console.error("Error:", error.message || error);
                    console.error("Name:", error.name || "Unknown");
                    console.error("Code:", error.code || "Unknown");
                    console.error("==============================================");

                    const cloudinaryError = new Error(
                        error.message ||
                        "Cloudinary rejected the image upload."
                    );

                    cloudinaryError.status =
                        error.http_code || 500;

                    cloudinaryError.http_code =
                        error.http_code || 500;

                    cloudinaryError.cloudinaryError = true;

                    return reject(cloudinaryError);
                }

                if (!result || !result.secure_url) {
                    return reject(
                        new Error(
                            "Cloudinary upload completed but did not return a secure URL."
                        )
                    );
                }

                resolve(result);
            }
        );

        stream.on("error", (streamError) => {
            console.error(
                "❌ Cloudinary upload stream error:",
                streamError.message
            );

            reject(streamError);
        });

        streamifier
            .createReadStream(buffer)
            .on("error", (readError) => {
                console.error(
                    "❌ Cloudinary buffer read error:",
                    readError.message
                );

                reject(readError);
            })
            .pipe(stream);
    });
};

/**
 * Delete an existing Cloudinary asset.
 *
 * @param {String} publicId
 * @returns {Promise<Object|null>}
 */
const deleteFromCloudinary = async (publicId) => {
    if (!publicId) {
        return null;
    }

    try {
        const result = await cloudinary.uploader.destroy(publicId);

        return result;
    } catch (error) {
        console.error("❌ Cloudinary delete error:", {
            message: error.message,
            http_code: error.http_code,
        });

        // Do not prevent the profile update from succeeding
        // just because the old avatar could not be deleted.
        return null;
    }
};

module.exports = {
    uploadToCloudinary,
    deleteFromCloudinary,
};