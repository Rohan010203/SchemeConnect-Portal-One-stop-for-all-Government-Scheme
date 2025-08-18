// In your existing multer.js file

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- Define the upload directory path relative to this config file ---
// Ensure this is the correct path where you want ALL uploads (including grievances) to go
const uploadDir = path.join(__dirname, '..', 'uploads');

// --- Ensure upload directory exists ---
if (!fs.existsSync(uploadDir)) {
    try {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(`Created upload directory: ${uploadDir}`);
    } catch (err) {
        console.error(`Error creating upload directory ${uploadDir}:`, err);
        // Handle critical error: maybe exit process or make sure server doesn't start
        // Depending on how critical uploads are for your app start.
    }
} else {
    console.log(`Upload directory exists: ${uploadDir}`);
}

// --- Set up storage engine ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Double-check directory exists during request time as a safeguard
        if (!fs.existsSync(uploadDir)) {
            console.error(`Upload directory ${uploadDir} missing during request!`);
            return cb(new Error(`Upload directory ${uploadDir} not found!`));
        }
        cb(null, uploadDir); // Files will be saved in your main ./uploads directory
    },
    filename: function (req, file, cb) {
        // Use a more robust filename creation if needed, but this is fine
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

// --- File type checker functions (Assuming these are already correct) ---
function checkFileTypeImage(file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|jfif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        console.warn(`Invalid image file type attempted: ${file.originalname} (mimetype: ${file.mimetype})`);
        cb(new Error('Invalid image file type. Only JPEG, JPG, PNG, GIF, JFIF allowed.'), false);
    }
}

function checkFileTypeDocuments(file, cb) {
    // Updated allowed extensions and mime types for better coverage and clarity
    const allowedExtensions = /pdf|doc|docx|txt|jpeg|jpg|png|csv|xlsx|xls/; // Added xlsx, xls
    const allowedMimeTypes = /application\/(pdf|msword|vnd.openxmlformats-officedocument.wordprocessingml.document|vnd.openxmlformats-officedocument.spreadsheetml.sheet|vnd.ms-excel)|text\/(plain|csv)|image\/(jpeg|png)/; // Added spreadsheet mime types

    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        console.warn(`Invalid document file type attempted: ${file.originalname} (mimetype: ${file.mimetype})`);
        cb(new Error('Invalid document type. Only PDF, DOC, DOCX, TXT, CSV, JPEG, JPG, PNG, XLSX, XLS files are allowed.'), false); // Updated message
    }
}


// --- Initialize upload middleware ---
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 15 * 1024 * 1024 // 15MB limit per file
    },
    fileFilter: function (req, file, cb) {
        console.log(`Processing file upload for field: ${file.fieldname}, filename: ${file.originalname}`);

        if (file.fieldname === "profilePic") {
            checkFileTypeImage(file, cb);
        } else if (file.fieldname === "verificationDoc") {
            checkFileTypeDocuments(file, cb);
        } else if (file.fieldname === "aadhaarCard") {
            checkFileTypeDocuments(file, cb);
        } else if (file.fieldname === "institutionIDCard") {
            checkFileTypeDocuments(file, cb);
        } else if (file.fieldname === "applicationDocument") {
            checkFileTypeDocuments(file, cb);
        }
        // --- ADD THIS NEW CONDITION FOR GRIEVANCE ATTACHMENT ---
        else if (file.fieldname === "attachment") {
             checkFileTypeDocuments(file, cb); // Use the document checker
        }
        // --- END NEW CONDITION ---
        else {
            console.warn(`Unexpected file field encountered: ${file.fieldname}. Rejecting.`);
            cb(new Error(`Unexpected file field: ${file.fieldname}`), false);
        }
    }
});

// Export the configured upload instance
module.exports = upload;