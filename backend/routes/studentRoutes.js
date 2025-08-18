// routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../config/multer'); // Use the single 'upload' instance
const multer = require('multer'); // Import multer for MulterError type checking

const {
    registerStudent,
    loginStudent,
    getStudentDetails,
    applyForScheme,
    getSchemeHistory,
    getPendingSchemes // You might fetch all history and filter on frontend, but keeping for completeness
} = require('../controllers/studentController');

// Register Student route - Expects 'profilePic' and 'institutionIDCard' fields
router.post('/register', (req, res, next) => {
    // Multer middleware for 'profilePic' and 'institutionIDCard' fields
    upload.fields([
        { name: 'profilePic', maxCount: 1 },
        { name: 'institutionIDCard', maxCount: 1 }
    ])(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `File upload error during registration: ${err.message}`});
        } else if (err) {
            return res.status(400).json({ message: err.message }); // Custom errors from fileFilter
        }
        // If multer runs without errors but files were not provided
        if (!req.files || !req.files.profilePic || !req.files.institutionIDCard) {
            return res.status(400).json({ message: 'Profile picture and Institution ID card are required for registration.' });
        }
        next(); // Proceed to registerStudent controller
    });
}, registerStudent);

// Login Student
router.post('/login', loginStudent);

// Get Specific Student Details (basic info)
router.get('/:id', getStudentDetails);

// Apply for a scheme (with document upload)
// This route now expects a file upload with the field name 'applicationDocument'
router.post(
    '/:studentId/apply-scheme/:schemeId',
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

// Get the student's scheme application history (all applications)
router.get('/:studentId/applications', getSchemeHistory);

// Get the student's pending scheme applications (filtered on server)
router.get('/:studentId/pending-schemes', getPendingSchemes);

module.exports = router;