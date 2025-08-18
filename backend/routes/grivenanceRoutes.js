// In your existing routes/grievanceRoutes.js file

const express = require('express');
const { submitGrievance, getGrievances, updateGrievanceStatus } = require('../controllers/grievanaceController');
const upload = require('../config/multer'); // Your multer config

const router = express.Router();

// Public route for submitting grievances
router.route('/griven').post(upload.single('attachment'), submitGrievance);

// Admin routes for viewing and managing grievances
// Apply the authentication middleware to these routes
router.route('/griven')
    .get(getGrievances); // GET /api/grievances (Admin)

router.route('/griven/:id/status')
    .patch(updateGrievanceStatus); // PATCH /api/grievances/:id/status (Admin)

module.exports = router;