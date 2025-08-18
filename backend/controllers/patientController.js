// controllers/patientController.js (Revised paths for uploads)
const Patient = require('../models/Patient');
const Scheme = require('../models/Scheme');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer'); // Import multer for MulterError type checking
const fs = require('fs');
const mongoose = require('mongoose');

// --- generateUniqueId (keep as is) ---
const generateUniqueId = async () => {
    let uniqueId;
    let isUnique = false;
    while (!isUnique) {
        uniqueId = 'PAT' + Math.floor(100000 + Math.random() * 900000);
        const existingPatient = await Patient.findOne({ uniqueId });
        if (!existingPatient) {
            isUnique = true;
        }
    }
    return uniqueId;
};

// --- registerPatient (Revised profilePic path) ---
exports.registerPatient = async (req, res) => {
    console.log('--- registerPatient Controller START ---');
    console.log('Request Body:', req.body);
    console.log('Request File:', req.file);
    console.log('--------------------------------------');
    const { name, age, bloodGroup, salary, medicalHistory, password } = req.body;
    if (!req.file) { // This check is mostly a fallback if multer middleware fails to reject it.
        console.error("Validation failed: req.file is missing!");
        return res.status(400).json({ message: 'Profile picture is required or invalid.' });
    }
    const patientData = {
        name, age, bloodGroup, salary, medicalHistory,
        profilePic: `/uploads/${req.file.filename}` // Path directly in /uploads
    };
    try {
        patientData.uniqueId = await generateUniqueId();
        if (!password) throw new Error('Password is required.');
        patientData.password = await bcrypt.hash(password, 10);
        const patient = new Patient(patientData);
        await patient.save();
        console.log('Patient Registered Successfully:', patient.uniqueId);
        const responseData = patient.toObject();
        delete responseData.password;
        res.status(201).json({ message: 'Patient registered successfully', uniqueId: patient.uniqueId, patient: responseData });
    } catch (error) {
        console.error('Registration Error:', error);
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error unlinking file after registration failure:', unlinkErr);
            });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join('. ') });
        }
        if (error.code === 11000) return res.status(400).json({ message: 'Failed to register. Potential duplicate entry.' });
        if (error instanceof multer.MulterError) return res.status(400).json({ message: `File upload error: ${error.message}` });
        return res.status(500).json({ message: error.message || 'Server error during registration.' });
    }
};

// --- loginPatient (keep as is) ---
exports.loginPatient = async (req, res) => {
    console.log('--- loginPatient Controller START ---');
    console.log('Login Body:', req.body);
    console.log('------------------------------------');
    const { uniqueId, password } = req.body;
    if (!uniqueId || !password) {
        return res.status(400).json({ message: 'Please provide Patient ID and password.' });
    }
    try {
        const patient = await Patient.findOne({ uniqueId });
        if (!patient) {
            return res.status(401).json({ message: 'Invalid Patient ID or Password.' });
        }
        const isMatch = await bcrypt.compare(password, patient.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid Patient ID or Password.' });
        }
        console.log(`Login successful for Patient ID: ${uniqueId}`);
        const patientData = patient.toObject();
        delete patientData.password;
        res.status(200).json({ message: 'Login successful', patient: patientData });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
};

// --- getPatientDetails (keep as is) ---
exports.getPatientDetails = async (req, res) => {
    console.log(`--- getPatientDetails Controller START (ID: ${req.params.id}) ---`);
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
             return res.status(400).json({ message: 'Invalid patient ID format.' });
        }
        const patient = await Patient.findById(req.params.id).select('-password -appliedSchemes');

        if (!patient) {
            return res.status(404).json({ message: 'Patient not found.' });
        }
        res.status(200).json(patient);
    } catch (error) {
        console.error('Get Patient Details Error:', error);
        if (error instanceof mongoose.Error.CastError) {
            return res.status(400).json({ message: 'Invalid patient ID format.' });
        }
        res.status(500).json({ message: 'Server error fetching patient details.' });
    }
};

// --- NEW: Apply for Scheme (Revised applicationDocument path) ---
exports.applyForScheme = async (req, res) => {
    const patientId = req.params.patientId;
    const schemeId = req.params.schemeId;
    const applicationDocument = req.file; // The uploaded file

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
        if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
        return res.status(400).json({ message: 'Invalid Patient ID format.' });
    }
    if (!mongoose.Types.ObjectId.isValid(schemeId)) {
        if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
        return res.status(400).json({ message: 'Invalid Scheme ID format.' });
    }
    if (!applicationDocument) { // This check should ideally be handled by Multer middleware first
        return res.status(400).json({ message: 'Application document is required.' });
    }

    try {
        console.log(`Patient ${patientId} attempting to apply for scheme ${schemeId} with document: ${applicationDocument.filename}`);

        const patient = await Patient.findById(patientId);
        if (!patient) {
            if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
            return res.status(404).json({ message: 'Patient not found' });
        }

        const scheme = await Scheme.findById(schemeId);
        if (!scheme) {
            if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
            return res.status(404).json({ message: 'Scheme not found' });
        }

        if (scheme.target !== 'patient') {
             console.warn(`Patient ${patientId} attempted to apply for non-patient scheme ${schemeId} (target: ${scheme.target})`);
             if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
             return res.status(400).json({ message: 'This scheme is not applicable to patients.' });
        }

        const existingApplication = patient.appliedSchemes.find(
            app => app.schemeId && app.schemeId.toString() === schemeId.toString()
        );

        if (existingApplication) {
             console.log(`Patient ${patientId} already applied for scheme ${schemeId}. Status: ${existingApplication.status}`);
             if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
            return res.status(400).json({ message: 'You have already applied for this scheme.' });
        }

        patient.appliedSchemes.push({
            schemeId: scheme._id,
            status: 'not-approved',
            appliedOn: new Date(),
            documents: [{
                url: `/uploads/${applicationDocument.filename}`, // Path directly in /uploads
                name: applicationDocument.originalname
            }]
        });

        await patient.save();

        console.log(`Successfully submitted application for scheme ${schemeId} by patient ${patientId}`);
        res.status(200).json({ message: 'Scheme application submitted successfully' });

    } catch (err) {
        console.error(`Error applying scheme ${schemeId} for patient ${patientId}:`, err);
        if (applicationDocument && applicationDocument.path) {
            fs.unlink(applicationDocument.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error unlinking file after application failure:', unlinkErr);
            });
        }
        if (err.name === 'ValidationError') {
             return res.status(400).json({ message: 'Validation error applying for scheme.', error: err.message });
        }
         if (err instanceof mongoose.Error.CastError) {
             return res.status(400).json({ message: 'Invalid data format encountered.', error: err.message });
         }
        res.status(500).json({ message: 'Server error while applying for scheme.', error: err.message });
    }
};


// --- NEW: Get Scheme History for Patient (keep as is, as paths are relative anyway) ---
exports.getSchemeHistory = async (req, res) => {
    const patientId = req.params.patientId;

    if (!mongoose.Types.ObjectId.isValid(patientId)) {
         return res.status(400).json({ message: 'Invalid Patient ID format' });
    }

    try {
        console.log(`Fetching scheme history for patient ${patientId}`);
        const patient = await Patient.findById(patientId)
                                     .populate('appliedSchemes.schemeId');

        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        const schemeHistory = patient.appliedSchemes.map(app => {
            const schemeData = app.schemeId ? {
                _id: app.schemeId._id,
                name: app.schemeId.name,
                description: app.schemeId.description,
                url: app.schemeId.url,
                referenceLink: app.schemeId.referenceLink,
                eligibilityAge: app.schemeId.eligibilityAge,
                eligibilityCondition: app.schemeId.eligibilityCondition,
                patientEligibility: app.schemeId.patientEligibility,
            } : null;

            return {
                applicationId: app._id,
                scheme: schemeData,
                status: app.status,
                appliedOn: app.appliedOn,
                documents: app.documents || []
            };
        }).sort((a, b) => new Date(b.appliedOn) - new Date(a.appliedOn));

        res.status(200).json(schemeHistory);

    } catch (err) {
        console.error(`Error fetching scheme history for patient ${patientId}:`, err);
         if (err instanceof mongoose.Error.CastError) {
             return res.status(400).json({ message: 'Invalid ID format encountered.', error: err.message });
         }
        res.status(500).json({ message: 'Error fetching scheme history', error: err.message });
    }
};