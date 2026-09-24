const User = require("../models/User");

const {
    uploadToCloudinary,
    deleteFromCloudinary,
} = require("../utils/cloudinaryUpload");

// ============================================================
// HELPERS
// ============================================================

/**
 * Safely trim a value.
 */
const cleanString = (value) => {
    if (value === undefined || value === null) {
        return value;
    }

    return String(value).trim();
};

/**
 * Convert an age value into a valid number.
 * Returns undefined when no usable value was supplied.
 */
const parseAge = (value) => {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    const numericAge = Number(value);

    if (!Number.isFinite(numericAge)) {
        return null;
    }

    if (numericAge < 0 || numericAge > 150) {
        return null;
    }

    return Math.floor(numericAge);
};

/**
 * Return a safe public user object.
 *
 * We deliberately fetch the user again from MongoDB and exclude
 * password fields before returning the response.
 */
const getSafeUser = async (userId) => {
    return User.findById(userId).select("-password");
};

/**
 * Extract a useful HTTP status from a Cloudinary error.
 */
const getCloudinaryStatus = (error) => {
    return (
        error?.http_code ||
        error?.statusCode ||
        error?.status ||
        null
    );
};

/**
 * Build a user-friendly Cloudinary error message while keeping
 * sensitive configuration details out of the response.
 */
const getCloudinaryErrorMessage = (error) => {
    const status = getCloudinaryStatus(error);
    const rawMessage =
        error?.message ||
        error?.error?.message ||
        "";

    const message = String(rawMessage).trim();

    if (status === 401) {
        return (
            "Cloudinary authentication failed. " +
            "Please verify the Cloudinary API credentials configured on the server."
        );
    }

    if (status === 403) {
        return (
            "Cloudinary rejected the upload request (403 Forbidden). " +
            "Please verify the Cloudinary account, API key, API secret, " +
            "upload permissions, and server environment variables."
        );
    }

    if (status === 404) {
        return (
            "The requested Cloudinary resource could not be found."
        );
    }

    if (status === 408) {
        return (
            "The Cloudinary upload timed out. Please try again."
        );
    }

    if (status === 420 || status === 429) {
        return (
            "Cloudinary rate limits were reached. Please wait a moment and try again."
        );
    }

    if (status >= 500) {
        return (
            "Cloudinary is temporarily unavailable. Please try again shortly."
        );
    }

    if (message) {
        return message;
    }

    return "Unable to upload the profile picture to Cloudinary.";
};

// ============================================================
// GET PROFILE
// ============================================================

/**
 * GET /api/v1/profile
 *
 * Get the currently authenticated user's profile.
 */
const getProfile = async (req, res) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        const user = await User.findById(req.user._id)
            .select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        return res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        console.error("==============================================");
        console.error("❌ GET PROFILE ERROR");
        console.error("==============================================");
        console.error("Message:", error?.message);
        console.error("==============================================");

        return res.status(500).json({
            success: false,
            message: "Unable to load profile.",
        });
    }
};

// ============================================================
// UPDATE PROFILE
// ============================================================

/**
 * PUT /api/v1/profile
 *
 * Update profile information and optionally upload a new avatar.
 *
 * Expected avatar field:
 *   multipart/form-data -> avatar
 */
const updateProfile = async (req, res) => {
    let newCloudinaryAsset = null;
    let oldAvatarPublicId = null;

    try {
        // --------------------------------------------------------
        // AUTHENTICATION CHECK
        // --------------------------------------------------------

        if (!req.user?._id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        // --------------------------------------------------------
        // LOAD CURRENT USER
        // --------------------------------------------------------

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        // --------------------------------------------------------
        // ACCOUNT STATUS
        // --------------------------------------------------------

        if (
            user.accountStatus === "suspended" ||
            user.accountStatus === "banned"
        ) {
            return res.status(403).json({
                success: false,
                message:
                    `Your account is currently ${user.accountStatus}. ` +
                    "Profile updates are not permitted.",
            });
        }

        // --------------------------------------------------------
        // EXTRACT REQUEST BODY
        // --------------------------------------------------------

        const {
            name,
            email,
            username,
            phone,
            bio,
            location,
            gender,
            age,
            relationshipStatus,
            statusUpdate,
            subscription,
        } = req.body || {};

        // --------------------------------------------------------
        // EMAIL
        // --------------------------------------------------------

        if (email !== undefined && email !== null) {
            const normalizedEmail = cleanString(email)?.toLowerCase();

            if (!normalizedEmail) {
                return res.status(400).json({
                    success: false,
                    message: "Email cannot be empty.",
                });
            }

            if (normalizedEmail !== user.email) {
                const existingEmailUser = await User.findOne({
                    email: normalizedEmail,
                    _id: { $ne: user._id },
                }).select("_id");

                if (existingEmailUser) {
                    return res.status(409).json({
                        success: false,
                        message: "Email already exists.",
                    });
                }

                user.email = normalizedEmail;
            }
        }

        // --------------------------------------------------------
        // USERNAME
        // --------------------------------------------------------

        if (username !== undefined && username !== null) {
            const normalizedUsername =
                cleanString(username)?.toLowerCase();

            if (!normalizedUsername) {
                return res.status(400).json({
                    success: false,
                    message: "Username cannot be empty.",
                });
            }

            if (normalizedUsername !== user.username) {
                const existingUsernameUser = await User.findOne({
                    username: normalizedUsername,
                    _id: { $ne: user._id },
                }).select("_id");

                if (existingUsernameUser) {
                    return res.status(409).json({
                        success: false,
                        message: "Username already exists.",
                    });
                }

                user.username = normalizedUsername;
            }
        }

        // --------------------------------------------------------
        // NAME
        // --------------------------------------------------------

        if (name !== undefined && name !== null) {
            const cleanedName = cleanString(name);

            if (!cleanedName) {
                return res.status(400).json({
                    success: false,
                    message: "Name cannot be empty.",
                });
            }

            user.name = cleanedName;
        }

        // --------------------------------------------------------
        // PHONE
        // --------------------------------------------------------

        if (phone !== undefined && phone !== null) {
            user.phone = cleanString(phone);
        }

        // --------------------------------------------------------
        // BIO
        // --------------------------------------------------------

        if (bio !== undefined && bio !== null) {
            user.bio = String(bio).trim();
        }

        // --------------------------------------------------------
        // LOCATION
        // --------------------------------------------------------

        if (location !== undefined && location !== null) {
            user.location = String(location).trim();
        }

        // --------------------------------------------------------
        // GENDER
        // --------------------------------------------------------

        if (gender !== undefined && gender !== null) {
            user.gender = String(gender).trim();
        }

        // --------------------------------------------------------
        // AGE
        // --------------------------------------------------------

        if (age !== undefined && age !== null && age !== "") {
            const parsedAge = parseAge(age);

            if (parsedAge === null) {
                return res.status(400).json({
                    success: false,
                    message: "Age must be a valid number between 0 and 150.",
                });
            }

            user.age = parsedAge;
        }

        // --------------------------------------------------------
        // RELATIONSHIP STATUS
        // --------------------------------------------------------

        if (
            relationshipStatus !== undefined &&
            relationshipStatus !== null
        ) {
            user.relationshipStatus =
                String(relationshipStatus).trim();
        }

        // --------------------------------------------------------
        // STATUS UPDATE
        // --------------------------------------------------------

        if (
            statusUpdate !== undefined &&
            statusUpdate !== null
        ) {
            user.statusUpdate =
                String(statusUpdate).trim();
        }

        // --------------------------------------------------------
        // SUBSCRIPTION
        //
        // Only update explicitly allowed subscription properties.
        // Do not allow the profile endpoint to replace the entire
        // subscription object.
        // --------------------------------------------------------

        if (
            subscription !== undefined &&
            subscription !== null
        ) {
            let subscriptionData = subscription;

            // FormData values arrive as strings.
            if (typeof subscriptionData === "string") {
                try {
                    subscriptionData =
                        JSON.parse(subscriptionData);
                } catch {
                    subscriptionData = null;
                }
            }

            if (
                subscriptionData &&
                typeof subscriptionData === "object"
            ) {
                if (
                    subscriptionData.plan !== undefined &&
                    user.subscription
                ) {
                    user.subscription.plan =
                        subscriptionData.plan;
                }

                if (
                    subscriptionData.status !== undefined &&
                    user.subscription
                ) {
                    user.subscription.status =
                        subscriptionData.status;
                }
            }
        }

        // --------------------------------------------------------
        // AVATAR UPLOAD
        // --------------------------------------------------------
        //
        // IMPORTANT:
        // We upload the new avatar FIRST.
        //
        // We do NOT delete the old avatar before the new upload
        // succeeds. This prevents a failed upload from leaving
        // the user without a profile picture.
        // --------------------------------------------------------

        if (req.file) {
            console.log(
                `📷 Processing avatar upload for user ${user._id}`
            );

            if (!req.file.buffer || !Buffer.isBuffer(req.file.buffer)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "The uploaded avatar file could not be processed.",
                });
            }

            // Keep the old ID until the new upload and database
            // update have completed successfully.
            oldAvatarPublicId = user.avatarPublicId || null;

            try {
                newCloudinaryAsset = await uploadToCloudinary(
                    req.file.buffer,
                    "eazy-check/profile-pictures"
                );
            } catch (cloudinaryError) {
                const status =
                    getCloudinaryStatus(cloudinaryError);

                const message =
                    getCloudinaryErrorMessage(
                        cloudinaryError
                    );

                console.error(
                    "=============================================="
                );
                console.error(
                    "❌ PROFILE AVATAR CLOUDINARY ERROR"
                );
                console.error(
                    "=============================================="
                );
                console.error("Status:", status || "Unknown");
                console.error("Message:", cloudinaryError?.message);
                console.error(
                    "Public ID:",
                    cloudinaryError?.public_id || "N/A"
                );
                console.error(
                    "=============================================="
                );

                return res.status(
                    status && status >= 400 && status < 600
                        ? status
                        : 502
                ).json({
                    success: false,
                    message,
                });
            }

            if (
                !newCloudinaryAsset ||
                !newCloudinaryAsset.secure_url ||
                !newCloudinaryAsset.public_id
            ) {
                console.error(
                    "❌ Cloudinary returned an incomplete upload result."
                );

                return res.status(502).json({
                    success: false,
                    message:
                        "Cloudinary upload completed without returning a valid image URL.",
                });
            }

            // Assign the new Cloudinary information to the user.
            user.avatarUrl =
                newCloudinaryAsset.secure_url;

            user.avatarPublicId =
                newCloudinaryAsset.public_id;
        }

        // --------------------------------------------------------
        // SAVE USER
        // --------------------------------------------------------

        await user.save();

        // --------------------------------------------------------
        // DELETE OLD AVATAR
        // --------------------------------------------------------
        //
        // This happens AFTER MongoDB has successfully saved the
        // new avatar.
        //
        // If deletion fails, we keep the new profile picture and
        // simply log the cleanup failure.
        // --------------------------------------------------------

        if (
            newCloudinaryAsset &&
            oldAvatarPublicId &&
            oldAvatarPublicId !==
                newCloudinaryAsset.public_id
        ) {
            try {
                await deleteFromCloudinary(
                    oldAvatarPublicId
                );

                console.log(
                    `🗑️ Old avatar deleted: ${oldAvatarPublicId}`
                );
            } catch (deleteError) {
                console.error(
                    "⚠️ Old Cloudinary avatar could not be deleted:",
                    deleteError?.message
                );

                // Do not fail the profile update.
            }
        }

        // --------------------------------------------------------
        // FETCH FRESH USER
        // --------------------------------------------------------

        const updatedUser = await getSafeUser(
            user._id
        );

        if (!updatedUser) {
            return res.status(500).json({
                success: false,
                message:
                    "Profile was updated, but the updated user could not be retrieved.",
            });
        }

        // --------------------------------------------------------
        // SUCCESS
        // --------------------------------------------------------

        return res.status(200).json({
            success: true,
            message: req.file
                ? "Profile and profile picture updated successfully."
                : "Profile updated successfully.",
            user: updatedUser,
        });
    } catch (error) {
        // ========================================================
        // UNEXPECTED ERROR
        // ========================================================

        console.error(
            "=============================================="
        );
        console.error(
            "❌ PROFILE UPDATE ERROR"
        );
        console.error(
            "=============================================="
        );
        console.error("Message:", error?.message);
        console.error("Name:", error?.name);
        console.error(
            "Status:",
            error?.http_code ||
                error?.statusCode ||
                error?.status ||
                "Unknown"
        );

        if (error?.stack) {
            console.error(error.stack);
        }

        console.error(
            "=============================================="
        );

        // --------------------------------------------------------
        // If a NEW Cloudinary asset was created but MongoDB failed,
        // attempt to remove that newly-created asset.
        //
        // This prevents orphaned Cloudinary files.
        // --------------------------------------------------------

        if (
            newCloudinaryAsset?.public_id
        ) {
            try {
                await deleteFromCloudinary(
                    newCloudinaryAsset.public_id
                );

                console.log(
                    "🧹 Cleaned up newly uploaded Cloudinary asset after database failure."
                );
            } catch (cleanupError) {
                console.error(
                    "⚠️ Failed to clean up new Cloudinary asset:",
                    cleanupError?.message
                );
            }
        }

        // --------------------------------------------------------
        // MONGOOSE VALIDATION ERROR
        // --------------------------------------------------------

        if (error?.name === "ValidationError") {
            const validationMessages = Object.values(
                error.errors || {}
            )
                .map((item) => item.message)
                .filter(Boolean);

            return res.status(400).json({
                success: false,
                message:
                    validationMessages.join(" ") ||
                    "One or more profile fields are invalid.",
            });
        }

        // --------------------------------------------------------
        // MONGOOSE DUPLICATE KEY
        // --------------------------------------------------------

        if (error?.code === 11000) {
            const duplicateFields =
                Object.keys(error.keyPattern || {});

            const field =
                duplicateFields[0] || "field";

            return res.status(409).json({
                success: false,
                message:
                    field === "email"
                        ? "Email already exists."
                        : field === "username"
                            ? "Username already exists."
                            : `A user with the same ${field} already exists.`,
            });
        }

        // --------------------------------------------------------
        // CLOUDINARY ERROR
        // --------------------------------------------------------

        if (
            error?.cloudinaryError ||
            error?.http_code
        ) {
            const cloudinaryStatus =
                getCloudinaryStatus(error);

            return res.status(
                cloudinaryStatus &&
                cloudinaryStatus >= 400 &&
                cloudinaryStatus < 600
                    ? cloudinaryStatus
                    : 502
            ).json({
                success: false,
                message:
                    getCloudinaryErrorMessage(error),
            });
        }

        // --------------------------------------------------------
        // GENERIC ERROR
        // --------------------------------------------------------

        return res.status(500).json({
            success: false,
            message:
                error?.message ||
                "Unable to update profile.",
        });
    }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getProfile,
    updateProfile,
};