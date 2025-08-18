// routes/hospitalRoutes.js (Revised)
const express = require('express');
const router = express.Router();
// Import the single configured multer instance
const upload = require('../config/multer'); // Assuming this handles different fieldnames
const multer = require('multer'); // <--- ADD THIS LINE

const {
    registerHospital,
    loginHospital,
    getHospitalDetails,
    applyForScheme,
    getSchemeHistory,
    getPendingSchemes
} = require('../controllers/hospitalController');

// Register a new hospital (uses upload.fields)
router.post(
    '/register',
    upload.fields([
        { name: 'profilePic', maxCount: 1 },
        { name: 'verificationDoc', maxCount: 1 }
    ]),
    registerHospital
);

// Hospital login
router.post('/login', loginHospital);

// Get hospital details by ID
router.get('/:id', getHospitalDetails);

// --- REVISED: Apply for a scheme (now with document upload) ---
router.post(
    '/:hospitalId/apply-scheme/:schemeId',
    (req, res, next) => {
        // Use upload.single() for the 'applicationDocument' field
        upload.single('applicationDocument')(req, res, function (err) {
            if (err instanceof multer.MulterError) { // You need to import multer for this if you didn't already
                return res.status(400).json({ message: `Document upload error: ${err.message}` });
            } else if (err) {
                return res.status(400).json({ message: err.message });
            }
            if (!req.file) { // Document is required for application
                return res.status(400).json({ message: 'Application document is required.' });
            }
            next(); // Proceed to controller
        });
    },
    applyForScheme
);

// Get all the applications made by the hospital (will include documents now)
router.get('/:hospitalId/applications', getSchemeHistory);

// Get all pending schemes for the hospital (will include documents now)
router.get('/:hospitalId/pending-schemes', getPendingSchemes);

module.exports = router;