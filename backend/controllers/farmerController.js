// controllers/farmerController.js
const Farmer = require('../models/Farmer');
const Scheme = require('../models/Scheme');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const fs = require('fs'); // For file cleanup
const multer = require('multer'); // For MulterError type check

// Generate a unique ID for the farmer
const generateUniqueId = async () => {
    let uniqueId;
    let isUnique = false;
    while (!isUnique) {
        uniqueId = 'FARM' + Math.floor(10000 + Math.random() * 90000); // FARM + 5 digits
        const existingFarmer = await Farmer.findOne({ uniqueId });
        if (!existingFarmer) {
            isUnique = true;
        }
    }
    return uniqueId;
};

// Register a new farmer
exports.registerFarmer = async (req, res) => {
    console.log('--- registerFarmer Controller START ---');
    console.log('Request Body:', req.body);
    console.log('Request Files:', req.files); // Note: req.files for multiple files
    console.log('--------------------------------------');

    const { name, age, farmLocation, landArea, cropType, annualIncome, password } = req.body;

    // Check if both files are uploaded by multer.fields
    if (!req.files || !req.files.profilePic || !req.files.aadhaarCard) {
        console.error("Validation failed: profilePic or aadhaarCard is missing!");
        return res.status(400).json({ message: 'Profile picture and Aadhaar card are required.' });
    }

    const profilePicPath = `/uploads/${req.files.profilePic[0].filename}`;
    const aadhaarCardPath = `/uploads/${req.files.aadhaarCard[0].filename}`;

    try {
        const uniqueId = await generateUniqueId();
        const hashedPassword = await bcrypt.hash(password, 10);

        const farmer = new Farmer({
            uniqueId,
            name,
            age,
            farmLocation,
            landArea,
            cropType,
            annualIncome,
            profilePic: profilePicPath,
            aadhaarCard: aadhaarCardPath,
            password: hashedPassword,
            appliedSchemes: []
        });

        await farmer.save();
        console.log('Farmer Registered Successfully:', farmer.uniqueId);

        const responseData = farmer.toObject();
        delete responseData.password; // Remove password from response
        res.status(201).json({ message: 'Farmer registered successfully', uniqueId: farmer.uniqueId, farmer: responseData });

    } catch (err) {
        console.error("Error registering farmer:", err);
        // Clean up uploaded files if DB save fails
        if (req.files && req.files.profilePic && req.files.profilePic[0] && req.files.profilePic[0].path) {
            fs.unlink(req.files.profilePic[0].path, (unlinkErr) => { if (unlinkErr) console.error("Failed to unlink profile pic:", unlinkErr); });
        }
        if (req.files && req.files.aadhaarCard && req.files.aadhaarCard[0] && req.files.aadhaarCard[0].path) {
            fs.unlink(req.files.aadhaarCard[0].path, (unlinkErr) => { if (unlinkErr) console.error("Failed to unlink Aadhaar card:", unlinkErr); });
        }
        if (err.code === 11000) {
             return res.status(400).json({ message: 'Failed to generate a unique ID or ID already exists, please try again.', error: err.message });
        }
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join('. ') });
        }
        res.status(500).json({ message: 'Error registering farmer', error: err.message });
    }
};

// Login a farmer
exports.loginFarmer = async (req, res) => {
    console.log('--- loginFarmer Controller START ---');
    console.log('Login Body:', req.body);
    console.log('------------------------------------');
    const { uniqueId, password } = req.body;
    if (!uniqueId || !password) {
        return res.status(400).json({ message: 'Please provide Farmer ID and password.' });
    }
    try {
        const farmer = await Farmer.findOne({ uniqueId: uniqueId });
        if (!farmer) {
            console.log(`Login attempt failed: Farmer not found for uniqueId: ${uniqueId}`);
            return res.status(401).json({ message: 'Invalid ID or Password' });
        }

        const isMatch = await bcrypt.compare(password, farmer.password);
        if (!isMatch) {
             console.log(`Login attempt failed: Invalid password for uniqueId: ${uniqueId}`);
            return res.status(401).json({ message: 'Invalid ID or Password' });
        }

        const token = "dummy-jwt-token-farmer"; // Replace with actual JWT generation
        const farmerData = farmer.toObject();
        delete farmerData.password; // Remove password from response
        res.json({ message: 'Login successful', farmer: farmerData, token });

    } catch (err) {
        console.error("Error logging in farmer:", err);
        res.status(500).json({ message: 'Error logging in', error: err.message });
    }
};

// Get details of a farmer USING _id from params
exports.getFarmerDetails = async (req, res) => {
    console.log(`--- getFarmerDetails Controller START (ID: ${req.params.id}) ---`);
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
             return res.status(400).json({ message: 'Invalid Farmer ID format' });
        }
        // Exclude password and appliedSchemes from this basic detail fetch
        const farmer = await Farmer.findById(req.params.id).select('-password -appliedSchemes');
        if (!farmer) {
            return res.status(404).json({ message: 'Farmer not found' });
        }
        res.json(farmer);
    } catch (err) {
        console.error(`Error fetching farmer details for _id: ${req.params.id}`, err);
         if (err instanceof mongoose.Error.CastError) {
             return res.status(400).json({ message: 'Invalid Farmer ID format.', error: err.message });
         }
        res.status(500).json({ message: 'Error fetching farmer details', error: err.message });
    }
};

// Apply for a scheme (handles document upload for scheme application)
exports.applyForScheme = async (req, res) => {
    const farmerId = req.params.farmerId;
    const schemeId = req.params.schemeId;
    const applicationDocument = req.file; // The uploaded file from Multer (single)

    // --- Input Validation ---
    if (!mongoose.Types.ObjectId.isValid(farmerId)) {
        if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
        console.warn(`Apply Scheme: Invalid Farmer ID format received: ${farmerId}`);
        return res.status(400).json({ message: 'Invalid Farmer ID format.' });
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
        console.log(`Attempting to apply scheme ${schemeId} for farmer ${farmerId} with document: ${applicationDocument.filename}`);

        const farmer = await Farmer.findById(farmerId);
        if (!farmer) {
            if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
            console.warn(`Apply Scheme: Farmer not found for ID: ${farmerId}`);
            return res.status(404).json({ message: 'Farmer not found' });
        }

        const scheme = await Scheme.findById(schemeId);
        if (!scheme) {
            if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
            console.warn(`Apply Scheme: Scheme not found for ID: ${schemeId}`);
            return res.status(404).json({ message: 'Scheme not found' });
        }

        // --- Check if scheme is targeted for farmers ---
        if (scheme.target !== 'farmer') {
            if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
            console.warn(`Apply Scheme: Scheme ${schemeId} is not targeted for farmers (target: ${scheme.target}).`);
            return res.status(400).json({ message: 'This scheme is not applicable to farmers.' });
        }

        // --- Check if already applied ---
        const existingApplication = farmer.appliedSchemes.find(app =>
            app.schemeId && app.schemeId.toString() === schemeId.toString()
        );

        if (existingApplication) {
            if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
            console.log(`Apply Scheme: Farmer ${farmerId} has already applied for scheme ${schemeId}. Status: ${existingApplication.status}`);
            return res.status(400).json({ message: 'You have already applied for this scheme.' });
        }
        // -----------------------------

        // All checks passed, add the application
        farmer.appliedSchemes.push({
            schemeId: scheme._id,
            status: 'not-approved',
            appliedOn: new Date(),
            documents: [{ // Store path and original filename of the uploaded document
                url: `/uploads/${applicationDocument.filename}`, // Path where Multer saved it
                name: applicationDocument.originalname
            }]
        });

        await farmer.save();

        console.log(`Apply Scheme: Successfully saved application for scheme ${schemeId} for farmer ${farmerId}`);
        res.status(200).json({ message: 'Scheme application submitted successfully' });

    } catch (err) {
        console.error(`Apply Scheme Error: Failed applying scheme ${schemeId} for farmer ${farmerId}. Error:`, err);
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

// Get scheme history for a farmer (includes documents)
exports.getSchemeHistory = async (req, res) => {
    try {
        const farmerId = req.params.farmerId;
        if (!mongoose.Types.ObjectId.isValid(farmerId)) {
             return res.status(400).json({ message: 'Invalid Farmer ID format' });
        }

        const farmer = await Farmer.findById(farmerId)
                                     .populate('appliedSchemes.schemeId'); // Populate scheme details

        if (!farmer) {
            return res.status(404).json({ message: 'Farmer not found' });
        }

        const schemeHistory = farmer.appliedSchemes.map(app => {
            const schemeData = app.schemeId ? {
                _id: app.schemeId._id,
                name: app.schemeId.name,
                description: app.schemeId.description,
                url: app.schemeId.url, // Include scheme image URL if needed
                referenceLink: app.schemeId.referenceLink, // Include scheme reference link
                // Include farmer-specific eligibility for display if needed
                eligibilityLandArea: app.schemeId.eligibilityLandArea,
                eligibilityCropType: app.schemeId.eligibilityCropType,
                eligibilityAnnualIncome: app.schemeId.eligibilityAnnualIncome,
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
        console.error(`Error fetching scheme history for farmer ${req.params.farmerId}:`, err);
         if (err instanceof mongoose.Error.CastError) {
             return res.status(400).json({ message: 'Invalid ID format encountered.', error: err.message });
         }
        res.status(500).json({ message: 'Error fetching scheme history', error: err.message });
    }
};

// Get pending schemes for a farmer (includes documents)
exports.getPendingSchemes = async (req, res) => {
     try {
        const farmerId = req.params.farmerId;
        if (!mongoose.Types.ObjectId.isValid(farmerId)) {
             return res.status(400).json({ message: 'Invalid Farmer ID format' });
        }

        const farmer = await Farmer.findById(farmerId)
                                     .populate({
                                         path: 'appliedSchemes.schemeId',
                                         model: 'Scheme'
                                     });

        if (!farmer) {
            return res.status(404).json({ message: 'Farmer not found' });
        }

        const pendingSchemes = farmer.appliedSchemes
            .filter(app => app.status === 'not-approved' && app.schemeId)
            .map(app => ({
                applicationId: app._id,
                scheme: {
                     _id: app.schemeId._id,
                     name: app.schemeId.name,
                     description: app.schemeId.description,
                     url: app.schemeId.url,
                     referenceLink: app.schemeId.referenceLink,
                     // Include farmer-specific eligibility for display if needed
                     eligibilityLandArea: app.schemeId.eligibilityLandArea,
                     eligibilityCropType: app.schemeId.eligibilityCropType,
                     eligibilityAnnualIncome: app.schemeId.eligibilityAnnualIncome,
                },
                status: app.status,
                appliedOn: app.appliedOn,
                documents: app.documents || [] // Include documents here
            }))
            .sort((a, b) => new Date(b.appliedOn) - new Date(a.appliedOn));

        res.json(pendingSchemes);
    } catch (err) {
        console.error(`Error fetching pending schemes for farmer ${req.params.farmerId}:`, err);
         if (err instanceof mongoose.Error.CastError) {
             return res.status(400).json({ message: 'Invalid ID format encountered.', error: err.message });
         }
        res.status(500).json({ message: 'Error fetching pending schemes', error: err.message });
    }
};