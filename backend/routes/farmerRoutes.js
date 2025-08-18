// routes/farmerRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../config/multer'); // Use the single 'upload' instance
const multer = require('multer'); // Import multer for MulterError type checking

const {
    registerFarmer,
    loginFarmer,
    getFarmerDetails,
    applyForScheme,
    getSchemeHistory,
    getPendingSchemes // You might fetch all history and filter on frontend, but keeping for completeness
} = require('../controllers/farmerController');

// Register Farmer route - Expects 'profilePic' and 'aadhaarCard' fields
router.post('/register', (req, res, next) => {
    // Multer middleware for 'profilePic' and 'aadhaarCard' fields
    upload.fields([
        { name: 'profilePic', maxCount: 1 },
        { name: 'aadhaarCard', maxCount: 1 }
    ])(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `File upload error during registration: ${err.message}`});
        } else if (err) {
            return res.status(400).json({ message: err.message }); // Custom errors from fileFilter
        }
        // If multer runs without errors but files were not provided
        if (!req.files || !req.files.profilePic || !req.files.aadhaarCard) {
            return res.status(400).json({ message: 'Profile picture and Aadhaar card are required for registration.' });
        }
        next(); // Proceed to registerFarmer controller
    });
}, registerFarmer);

// Login Farmer
router.post('/login', loginFarmer);

// Get Specific Farmer Details (basic info)
router.get('/:id', getFarmerDetails);

// Apply for a scheme (with document upload)
// This route now expects a file upload with the field name 'applicationDocument'
router.post(
    '/:farmerId/apply-scheme/:schemeId',
    (req, res, next) => {
        // Multer middleware for 'applicationDocument' field
        upload.single('applicationDocument')(req, res, function (err) {
            if (err instanceof multer.MulterError) {
                // A Multer error occurred during upload (e.g., file size limit, wrong field name)
                return res.status(400).json({ message: `Document upload error: ${err.message}` });
            } else if (err) {
                // An unknown error occurred or a custom error from the fileFilter
                return res.status(400).json({ message: err.message });
            }
            // If multer runs without errors but no file was provided (e.g., client forgot to attach)
            if (!req.file) {
                return res.status(400).json({ message: 'Application document is required.' });
            }
            next(); // Proceed to the controller if no errors
        });
    },
    applyForScheme // The controller function that will process the request
);

// Get the farmer's scheme application history (all applications)
router.get('/:farmerId/applications', getSchemeHistory);

// Get the farmer's pending scheme applications (filtered on server)
router.get('/:farmerId/pending-schemes', getPendingSchemes);

module.exports = router;