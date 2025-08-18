// controllers/hospitalController.js (Revised applyForScheme and getSchemeHistory/getPendingSchemes)

const Hospital = require('../models/Hospital');
const Scheme = require('../models/Scheme');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const fs = require('fs'); // For file cleanup
const multer = require('multer'); // For MulterError type check

// Generate a unique ID for the hospital (still used for registration)
const generateUniqueId = () => 'HOSP' + Math.floor(1000 + Math.random() * 9000);

// Register a new hospital
exports.registerHospital = async (req, res) => {
    try {
        const { name, location, services, numberOfBeds, numberOfOutpatients, area, password } = req.body;

        if (!req.files || !req.files.profilePic || !req.files.verificationDoc) {
            return res.status(400).json({ message: 'Profile picture and verification document are required' });
        }

        // Store paths as /uploads/filename directly
        const profilePicPath = `/uploads/${req.files.profilePic[0].filename}`;
        const verificationDocPath = `/uploads/${req.files.verificationDoc[0].filename}`;

        const hashedPassword = await bcrypt.hash(password, 10);
        const uniqueId = generateUniqueId();

        const hospital = new Hospital({
            uniqueId,
            name,
            location,
            services: Array.isArray(services) ? services : [services],
            numberOfBeds,
            numberOfOutpatients,
            area,
            profilePic: profilePicPath, // Store the corrected path
            verificationDoc: verificationDocPath, // Store the corrected path
            password: hashedPassword,
            appliedSchemes: []
        });

        await hospital.save();
        res.status(201).json({ message: 'Hospital registered successfully', hospital });
    } catch (err) {
        console.error("Error registering hospital:", err);
        // Clean up uploaded files if DB save fails
        if (req.files && req.files.profilePic && req.files.profilePic[0] && req.files.profilePic[0].path) {
            fs.unlink(req.files.profilePic[0].path, (unlinkErr) => { if (unlinkErr) console.error("Failed to unlink profile pic:", unlinkErr); });
        }
        if (req.files && req.files.verificationDoc && req.files.verificationDoc[0] && req.files.verificationDoc[0].path) {
            fs.unlink(req.files.verificationDoc[0].path, (unlinkErr) => { if (unlinkErr) console.error("Failed to unlink verification doc:", unlinkErr); });
        }
        if (err.code === 11000) {
             return res.status(400).json({ message: 'Failed to generate a unique ID or ID already exists, please try again.', error: err.message });
        }
        res.status(500).json({ message: 'Error registering hospital', error: err.message });
    }
};

// Login a hospital (Finds by uniqueId, returns object with _id)
exports.loginHospital = async (req, res) => {
    try {
        const { uniqueId, password } = req.body;

        const hospital = await Hospital.findOne({ uniqueId: uniqueId });
        if (!hospital) {
            console.log(`Login attempt failed: Hospital not found for uniqueId: ${uniqueId}`);
            return res.status(400).json({ message: 'Invalid ID or Password' });
        }

        const isMatch = await bcrypt.compare(password, hospital.password);
        if (!isMatch) {
             console.log(`Login attempt failed: Invalid password for uniqueId: ${uniqueId}`);
            return res.status(400).json({ message: 'Invalid ID or Password' });
        }

        const token = "dummy-jwt-token";
        res.json({ message: 'Login successful', hospital, token });

    } catch (err) {
        console.error("Error logging in:", err);
        res.status(500).json({ message: 'Error logging in', error: err.message });
    }
};

// Get details of a hospital USING _id from params
exports.getHospitalDetails = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
             return res.status(400).json({ message: 'Invalid Hospital ID format' });
        }
        // Exclude password and appliedSchemes from this basic detail fetch
        const hospital = await Hospital.findById(req.params.id).select('-password -appliedSchemes');
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }
        res.json(hospital);
    } catch (err) {
        console.error(`Error fetching hospital details for _id: ${req.params.id}`, err);
         if (err instanceof mongoose.Error.CastError) {
             return res.status(400).json({ message: 'Invalid Hospital ID format.', error: err.message });
         }
        res.status(500).json({ message: 'Error fetching hospital details', error: err.message });
    }
};

// --- REVISED: applyForScheme (handles document upload) ---
exports.applyForScheme = async (req, res) => {
    const hospitalId = req.params.hospitalId;
    const schemeId = req.params.schemeId;
    const applicationDocument = req.file; // The uploaded file from Multer

    // --- Input Validation ---
    if (!mongoose.Types.ObjectId.isValid(hospitalId)) {
        if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
        console.warn(`Apply Scheme: Invalid Hospital ID format received: ${hospitalId}`);
        return res.status(400).json({ message: 'Invalid Hospital ID format.' });
    }
    if (!mongoose.Types.ObjectId.isValid(schemeId)) {
        if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
        console.warn(`Apply Scheme: Invalid Scheme ID format received: ${schemeId}`);
        return res.status(400).json({ message: 'Invalid Scheme ID format.' });
    }
    if (!applicationDocument) { // Document is required for application
        return res.status(400).json({ message: 'Application document is required.' });
    }
    //-------------------------

    try {
        console.log(`Attempting to apply scheme ${schemeId} for hospital ${hospitalId} with document: ${applicationDocument.filename}`);

        const hospital = await Hospital.findById(hospitalId);
        if (!hospital) {
            if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
            console.warn(`Apply Scheme: Hospital not found for ID: ${hospitalId}`);
            return res.status(404).json({ message: 'Hospital not found' });
        }

        const scheme = await Scheme.findById(schemeId);
        if (!scheme) {
            if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
            console.warn(`Apply Scheme: Scheme not found for ID: ${schemeId}`);
            return res.status(404).json({ message: 'Scheme not found' });
        }

        // --- Check if scheme is targeted for hospitals ---
        if (scheme.target !== 'hospital') {
            if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
            console.warn(`Apply Scheme: Scheme ${schemeId} is not targeted for hospitals.`);
            return res.status(400).json({ message: 'This scheme is not applicable to hospitals.' });
        }

        // --- Check if already applied ---
        const existingApplication = hospital.appliedSchemes.find(app =>
            app.schemeId && app.schemeId.toString() === schemeId.toString()
        );

        if (existingApplication) {
            if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
            console.log(`Apply Scheme: Hospital ${hospitalId} has already applied for scheme ${schemeId}. Status: ${existingApplication.status}`);
            return res.status(400).json({ message: 'Hospital has already applied for this scheme.' });
        }
        // -----------------------------

        // All checks passed, add the application
        hospital.appliedSchemes.push({
            schemeId: scheme._id,
            status: 'not-approved',
            appliedOn: new Date(),
            documents: [{ // Store path and original filename of the uploaded document
                url: `/uploads/${applicationDocument.filename}`, // Path where Multer saved it
                name: applicationDocument.originalname
            }]
        });

        await hospital.save();

        console.log(`Apply Scheme: Successfully saved application for scheme ${schemeId} for hospital ${hospitalId}`);
        res.status(200).json({ message: 'Scheme application submitted successfully' });

    } catch (err) {
        console.error(`Apply Scheme Error: Failed applying scheme ${schemeId} for hospital ${hospitalId}. Error:`, err);
        // IMPORTANT: Clean up the uploaded file if an error occurs during DB operations
        if (applicationDocument && applicationDocument.path) {
            fs.unlink(applicationDocument.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error unlinking file after application failure:', unlinkErr);
            });
        }
        if (err.name === 'ValidationError') {
             console.error('Validation Error Details:', err.errors);
             return res.status(400).json({
                 message: 'Validation error applying for scheme. Please check the data.',
                 error: err.message,
                 details: err.errors
             });
        }
         if (err instanceof mongoose.Error.CastError) {
             console.error('Cast Error Details:', err);
             return res.status(400).json({
                 message: 'Invalid data format encountered during application.',
                 error: err.message,
                 path: err.path,
                 value: err.value
             });
         }
        res.status(500).json({
             message: 'Internal server error while applying for scheme.',
             error: err.message
        });
    }
};

// --- REVISED: getSchemeHistory (to include documents) ---
exports.getSchemeHistory = async (req, res) => {
    try {
        const hospitalId = req.params.hospitalId;
        if (!mongoose.Types.ObjectId.isValid(hospitalId)) {
             return res.status(400).json({ message: 'Invalid Hospital ID format' });
        }

        const hospital = await Hospital.findById(hospitalId)
                                     .populate('appliedSchemes.schemeId'); // Populate scheme details

        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        const schemeHistory = hospital.appliedSchemes.map(app => {
            const schemeData = app.schemeId ? {
                _id: app.schemeId._id,
                name: app.schemeId.name,
                description: app.schemeId.description,
                url: app.schemeId.url, // Include scheme image URL if needed
                referenceLink: app.schemeId.referenceLink // Include scheme reference link
            } : null;

            return {
                applicationId: app._id,
                scheme: schemeData,
                status: app.status,
                appliedOn: app.appliedOn,
                documents: app.documents || [] // Include documents here
            };
        }).sort((a, b) => new Date(b.appliedOn) - new Date(a.appliedOn)); // Sort by most recent first

        res.json(schemeHistory);
    } catch (err) {
        console.error(`Error fetching scheme history for hospital ${req.params.hospitalId}:`, err);
         if (err instanceof mongoose.Error.CastError) {
             return res.status(400).json({ message: 'Invalid ID format encountered.', error: err.message });
         }
        res.status(500).json({ message: 'Error fetching scheme history', error: err.message });
    }
};

// --- REVISED: getPendingSchemes (to include documents) ---
exports.getPendingSchemes = async (req, res) => {
     try {
        const hospitalId = req.params.hospitalId;
        if (!mongoose.Types.ObjectId.isValid(hospitalId)) {
             return res.status(400).json({ message: 'Invalid Hospital ID format' });
        }

        const hospital = await Hospital.findById(hospitalId)
                                     .populate({
                                         path: 'appliedSchemes.schemeId',
                                         model: 'Scheme'
                                     });

        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }

        const pendingSchemes = hospital.appliedSchemes
            .filter(app => app.status === 'not-approved' && app.schemeId)
            .map(app => ({
                applicationId: app._id,
                scheme: {
                     _id: app.schemeId._id,
                     name: app.schemeId.name,
                     description: app.schemeId.description,
                     url: app.schemeId.url,
                     referenceLink: app.schemeId.referenceLink
                },
                status: app.status,
                appliedOn: app.appliedOn,
                documents: app.documents || [] // Include documents here
            }))
            .sort((a, b) => new Date(b.appliedOn) - new Date(a.appliedOn));

        res.json(pendingSchemes);
    } catch (err) {
        console.error(`Error fetching pending schemes for hospital ${req.params.hospitalId}:`, err);
         if (err instanceof mongoose.Error.CastError) {
             return res.status(400).json({ message: 'Invalid ID format encountered.', error: err.message });
         }
        res.status(500).json({ message: 'Error fetching pending schemes', error: err.message });
    }
};