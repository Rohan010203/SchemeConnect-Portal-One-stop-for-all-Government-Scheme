// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const {
    loginAdmin,
    getAllHospitals,
    getAllApplications,      // Fetches combined applications
    updateApplicationStatus, // Single endpoint to update status
} = require('../controllers/adminController');

// Admin Login Route
router.post('/login', loginAdmin);

// Get All Hospitals
router.get('/hospitals', getAllHospitals);

// Get All Scheme Applications (Combined Hospital & Patient)
router.get('/applications', getAllApplications);

// ** REVISED ROUTE: Update Application Status (using PATCH and data in body) **
router.patch('/applications/status', updateApplicationStatus);
// NOTE: The previous route was router.patch('/applications/:applicationId/status', ...)
// We removed :applicationId from the URL because we'll get it from the request body now.
// This makes the endpoint more generic.

module.exports = router;