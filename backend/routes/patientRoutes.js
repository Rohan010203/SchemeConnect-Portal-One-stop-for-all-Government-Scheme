// routes/patientRoutes.js (Revised)
const express = require('express');
const router = express.Router();
// Import the single configured multer instance
const upload = require('../config/multer'); // Use the single 'upload' instance
const multer = require('multer'); // <--- ADD THIS LINE

const {
    registerPatient,
    loginPatient,
    getPatientDetails,
    applyForScheme,
    getSchemeHistory
} = require('../controllers/patientController');

// Register Patient route - Use upload.single('profilePic')
router.post('/register', (req, res, next) => {
    // Multer middleware for 'profilePic' field
    upload.single('profilePic')(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ message: `File upload error: ${err.message}`});
        } else if (err) {
            return res.status(400).json({ message: err.message }); // Custom errors from fileFilter
        }
        // If multer runs without errors but no file was provided (e.g., client forgot to attach)
        if (!req.file) {
            return res.status(400).json({ message: 'Profile picture is required.' });
        }
        next(); // Proceed to registerPatient controller
    });
}, registerPatient);

// Login (no change)
router.post('/login', loginPatient);

// Get Specific Patient Details (basic info)
router.get('/:id', getPatientDetails);

// --- NEW ROUTE: Apply for a scheme (with document upload) ---
// This route now expects a file upload with the field name 'applicationDocument'
router.post(
    '/:patientId/apply-scheme/:schemeId',
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

// --- NEW ROUTE: Get the patient's scheme application history ---
router.get('/:patientId/applications', getSchemeHistory);


module.exports = router;