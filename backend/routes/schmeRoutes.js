const express = require('express');
const router = express.Router();
const { 
    getAllSchemes, 
    createScheme, 
    deleteScheme, 
    getSchemeById,
    updateScheme,
    getSchemesByHospital,
    getAppliedSchemesByHospital
} = require('../controllers/schmeController');

// Get all schemes
router.get('/', getAllSchemes);

// Create a new scheme
router.post('/', createScheme);

// Get schemes for a specific hospital with application status
router.get('/hospital/:hospitalId', getSchemesByHospital);

// Get only the applied schemes for a hospital
router.get('/hospital/:hospitalId/applied', getAppliedSchemesByHospital);

// Get a scheme by ID
router.get('/:id', getSchemeById);

// Update a scheme
router.put('/:id', updateScheme);

// Delete a scheme
router.delete('/:id', deleteScheme);

module.exports = router;