// controllers/studentController.js
const Student = require('../models/Student');
const Scheme = require('../models/Scheme');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const fs = require('fs'); // For file cleanup
const multer = require('multer'); // For MulterError type check

// Generate a unique ID for the student
const generateUniqueId = async () => {
    let uniqueId;
    let isUnique = false;
    while (!isUnique) {
        uniqueId = 'STUD' + Math.floor(10000 + Math.random() * 90000); // STUD + 5 digits
        const existingStudent = await Student.findOne({ uniqueId });
        if (!existingStudent) {
            isUnique = true;
        }
    }
    return uniqueId;
};

// Register a new student
exports.registerStudent = async (req, res) => {
    console.log('--- registerStudent Controller START ---');
    console.log('Request Body:', req.body);
    console.log('Request Files:', req.files); // Note: req.files for multiple files
    console.log('--------------------------------------');

    const { name, age, educationalInstitution, courseOfStudy, academicYear, annualFamilyIncome, password } = req.body;

    // Check if both files are uploaded by multer.fields
    if (!req.files || !req.files.profilePic || !req.files.institutionIDCard) {
        console.error("Validation failed: profilePic or institutionIDCard is missing!");
        return res.status(400).json({ message: 'Profile picture and Institution ID card are required.' });
    }

    const profilePicPath = `/uploads/${req.files.profilePic[0].filename}`;
    const institutionIDCardPath = `/uploads/${req.files.institutionIDCard[0].filename}`;

    try {
        const uniqueId = await generateUniqueId();
        const hashedPassword = await bcrypt.hash(password, 10);

        const student = new Student({
            uniqueId,
            name,
            age,
            educationalInstitution,
            courseOfStudy,
            academicYear,
            annualFamilyIncome,
            profilePic: profilePicPath,
            institutionIDCard: institutionIDCardPath,
            password: hashedPassword,
            appliedSchemes: []
        });

        await student.save();
        console.log('Student Registered Successfully:', student.uniqueId);

        const responseData = student.toObject();
        delete responseData.password; // Remove password from response
        res.status(201).json({ message: 'Student registered successfully', uniqueId: student.uniqueId, student: responseData });

    } catch (err) {
        console.error("Error registering student:", err);
        // Clean up uploaded files if DB save fails
        if (req.files && req.files.profilePic && req.files.profilePic[0] && req.files.profilePic[0].path) {
            fs.unlink(req.files.profilePic[0].path, (unlinkErr) => { if (unlinkErr) console.error("Failed to unlink profile pic:", unlinkErr); });
        }
        if (req.files && req.files.institutionIDCard && req.files.institutionIDCard[0] && req.files.institutionIDCard[0].path) {
            fs.unlink(req.files.institutionIDCard[0].path, (unlinkErr) => { if (unlinkErr) console.error("Failed to unlink institution ID card:", unlinkErr); });
        }
        if (err.code === 11000) {
             return res.status(400).json({ message: 'Failed to generate a unique ID or ID already exists, please try again.', error: err.message });
        }
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join('. ') });
        }
        res.status(500).json({ message: 'Error registering student', error: err.message });
    }
};

// Login a student
exports.loginStudent = async (req, res) => {
    console.log('--- loginStudent Controller START ---');
    console.log('Login Body:', req.body);
    console.log('------------------------------------');
    const { uniqueId, password } = req.body;
    if (!uniqueId || !password) {
        return res.status(400).json({ message: 'Please provide Student ID and password.' });
    }
    try {
        const student = await Student.findOne({ uniqueId: uniqueId });
        if (!student) {
            console.log(`Login attempt failed: Student not found for uniqueId: ${uniqueId}`);
            return res.status(401).json({ message: 'Invalid ID or Password' });
        }

        const isMatch = await bcrypt.compare(password, student.password);
        if (!isMatch) {
             console.log(`Login attempt failed: Invalid password for uniqueId: ${uniqueId}`);
            return res.status(401).json({ message: 'Invalid ID or Password' });
        }

        const token = "dummy-jwt-token-student"; // Replace with actual JWT generation
        const studentData = student.toObject();
        delete studentData.password; // Remove password from response
        res.json({ message: 'Login successful', student: studentData, token });

    } catch (err) {
        console.error("Error logging in student:", err);
        res.status(500).json({ message: 'Error logging in', error: err.message });
    }
};

// Get details of a student USING _id from params
exports.getStudentDetails = async (req, res) => {
    console.log(`--- getStudentDetails Controller START (ID: ${req.params.id}) ---`);
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
             return res.status(400).json({ message: 'Invalid Student ID format' });
        }
        // Exclude password and appliedSchemes from this basic detail fetch
        const student = await Student.findById(req.params.id).select('-password -appliedSchemes');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }
        res.json(student);
    } catch (err) {
        console.error(`Error fetching student details for _id: ${req.params.id}`, err);
         if (err instanceof mongoose.Error.CastError) {
             return res.status(400).json({ message: 'Invalid Student ID format.', error: err.message });
         }
        res.status(500).json({ message: 'Error fetching student details', error: err.message });
    }
};

// Apply for a scheme (handles document upload for scheme application)
exports.applyForScheme = async (req, res) => {
    const studentId = req.params.studentId;
    const schemeId = req.params.schemeId;
    const applicationDocument = req.file; // The uploaded file from Multer (single)

    // --- Input Validation ---
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
        if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
        console.warn(`Apply Scheme: Invalid Student ID format received: ${studentId}`);
        return res.status(400).json({ message: 'Invalid Student ID format.' });
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
        console.log(`Attempting to apply scheme ${schemeId} for student ${studentId} with document: ${applicationDocument.filename}`);

        const student = await Student.findById(studentId);
        if (!student) {
            if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
            console.warn(`Apply Scheme: Student not found for ID: ${studentId}`);
            return res.status(404).json({ message: 'Student not found' });
        }

        const scheme = await Scheme.findById(schemeId);
        if (!scheme) {
            if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
            console.warn(`Apply Scheme: Scheme not found for ID: ${schemeId}`);
            return res.status(404).json({ message: 'Scheme not found' });
        }

        // --- Check if scheme is targeted for students ---
        if (scheme.target !== 'student') {
            if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
            console.warn(`Apply Scheme: Scheme ${schemeId} is not targeted for students (target: ${scheme.target}).`);
            return res.status(400).json({ message: 'This scheme is not applicable to students.' });
        }

        // --- Check if already applied ---
        const existingApplication = student.appliedSchemes.find(app =>
            app.schemeId && app.schemeId.toString() === schemeId.toString()
        );

        if (existingApplication) {
            if (applicationDocument && applicationDocument.path) { fs.unlink(applicationDocument.path, (err) => { /* handle unlink error */ }); }
            console.log(`Apply Scheme: Student ${studentId} has already applied for scheme ${schemeId}. Status: ${existingApplication.status}`);
            return res.status(400).json({ message: 'You have already applied for this scheme.' });
        }
        // -----------------------------

        // All checks passed, add the application
        student.appliedSchemes.push({
            schemeId: scheme._id,
            status: 'not-approved',
            appliedOn: new Date(),
            documents: [{ // Store path and original filename of the uploaded document
                url: `/uploads/${applicationDocument.filename}`, // Path where Multer saved it
                name: applicationDocument.originalname
            }]
        });

        await student.save();

        console.log(`Apply Scheme: Successfully saved application for scheme ${schemeId} for student ${studentId}`);
        res.status(200).json({ message: 'Scheme application submitted successfully' });

    } catch (err) {
        console.error(`Apply Scheme Error: Failed applying scheme ${schemeId} for student ${studentId}. Error:`, err);
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

// Get scheme history for a student (includes documents)
exports.getSchemeHistory = async (req, res) => {
    try {
        const studentId = req.params.studentId;
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
             return res.status(400).json({ message: 'Invalid Student ID format' });
        }

        const student = await Student.findById(studentId)
                                     .populate('appliedSchemes.schemeId'); // Populate scheme details

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const schemeHistory = student.appliedSchemes.map(app => {
            const schemeData = app.schemeId ? {
                _id: app.schemeId._id,
                name: app.schemeId.name,
                description: app.schemeId.description,
                url: app.schemeId.url, // Include scheme image URL if needed
                referenceLink: app.schemeId.referenceLink, // Include scheme reference link
                // Include student-specific eligibility for display if needed
                eligibilityMinimumGPA: app.schemeId.eligibilityMinimumGPA,
                eligibilityCourseType: app.schemeId.eligibilityCourseType,
                eligibilityAnnualFamilyIncome: app.schemeId.eligibilityAnnualFamilyIncome,
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
        console.error(`Error fetching scheme history for student ${req.params.studentId}:`, err);
         if (err instanceof mongoose.Error.CastError) {
             return res.status(400).json({ message: 'Invalid ID format encountered.', error: err.message });
         }
        res.status(500).json({ message: 'Error fetching scheme history', error: err.message });
    }
};

// Get pending schemes for a student (includes documents)
exports.getPendingSchemes = async (req, res) => {
     try {
        const studentId = req.params.studentId;
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
             return res.status(400).json({ message: 'Invalid Student ID format' });
        }

        const student = await Student.findById(studentId)
                                     .populate({
                                         path: 'appliedSchemes.schemeId',
                                         model: 'Scheme'
                                     });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const pendingSchemes = student.appliedSchemes
            .filter(app => app.status === 'not-approved' && app.schemeId)
            .map(app => ({
                applicationId: app._id,
                scheme: {
                     _id: app.schemeId._id,
                     name: app.schemeId.name,
                     description: app.schemeId.description,
                     url: app.schemeId.url,
                     referenceLink: app.schemeId.referenceLink,
                     // Include student-specific eligibility for display if needed
                     eligibilityMinimumGPA: app.schemeId.eligibilityMinimumGPA,
                     eligibilityCourseType: app.schemeId.eligibilityCourseType,
                     eligibilityAnnualFamilyIncome: app.schemeId.eligibilityAnnualFamilyIncome,
                },
                status: app.status,
                appliedOn: app.appliedOn,
                documents: app.documents || [] // Include documents here
            }))
            .sort((a, b) => new Date(b.appliedOn) - new Date(a.appliedOn));

        res.json(pendingSchemes);
    } catch (err) {
        console.error(`Error fetching pending schemes for student ${req.params.studentId}:`, err);
         if (err instanceof mongoose.Error.CastError) {
             return res.status(400).json({ message: 'Invalid ID format encountered.', error: err.message });
         }
        res.status(500).json({ message: 'Error fetching pending schemes', error: err.message });
    }
};