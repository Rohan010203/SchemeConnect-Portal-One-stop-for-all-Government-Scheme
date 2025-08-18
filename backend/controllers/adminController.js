const Hospital = require('../models/Hospital');
const Patient = require('../models/Patient');
const Scheme = require('../models/Scheme');
const Farmer = require('../models/Farmer'); // <--- NEW: Import Farmer model
const mongoose = require('mongoose');
const Student = require('../models/Student'); // <--- NEW: Import Farmer model

// Admin login (remains the same)
exports.loginAdmin = async (req, res) => {
    const { username, password } = req.body;
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const token = "dummy-admin-token"; // Replace with actual JWT generation
        return res.json({ message: 'Admin login successful', token });
    }
    return res.status(401).json({ message: 'Invalid admin credentials' });
};

// Get all hospitals (remains the same)
exports.getAllHospitals = async (req, res) => {
    try {
        const hospitals = await Hospital.find().select('name uniqueId location numberOfBeds area services');
        res.json(hospitals);
    } catch (err) {
        console.error("Error fetching hospitals:", err);
        res.status(500).json({ message: 'Error fetching hospitals', error: err.message });
    }
};

// *** REVISED: Get all scheme applications (Hospital + Patient + Farmer) ***
exports.getAllApplications = async (req, res) => {
    try {
        const combinedApplications = [];

        // --- Fetch and process Hospital Applications ---
        const hospitalsWithApps = await Hospital.find({ 'appliedSchemes.0': { $exists: true } })
            .populate('appliedSchemes.schemeId', 'name description')
            .select('name uniqueId location numberOfBeds area appliedSchemes._id appliedSchemes.status appliedSchemes.appliedOn appliedSchemes.schemeId appliedSchemes.documents');

        hospitalsWithApps.forEach(hospital => {
            hospital.appliedSchemes.forEach(app => {
                if (!app._id || !hospital._id) {
                    console.warn(`Skipping hospital application due to missing _id: app._id=${app._id}, hospital._id=${hospital._id}. Hospital Name: ${hospital.name}`);
                    return;
                }
                const schemeDetails = app.schemeId ? { schemeId: app.schemeId._id, schemeName: app.schemeId.name, } : { schemeId: null, schemeName: 'Scheme Deleted/Unavailable' };
                combinedApplications.push({
                    applicationId: app._id, applicantId: hospital._id, applicantType: 'hospital', applicantName: hospital.name,
                    ...schemeDetails, status: app.status, appliedOn: app.appliedOn, documents: app.documents || [],
                    details: { beds: hospital.numberOfBeds, location: hospital.location, area: hospital.area }
                });
            });
        });

        // --- Fetch and process Patient Applications ---
        const patientsWithApps = await Patient.find({ 'appliedSchemes.0': { $exists: true } })
            .populate('appliedSchemes.schemeId', 'name description')
            .select('name uniqueId age medicalHistory bloodGroup appliedSchemes._id appliedSchemes.status appliedSchemes.appliedOn appliedSchemes.schemeId appliedSchemes.documents');

        patientsWithApps.forEach(patient => {
            patient.appliedSchemes.forEach(app => {
                if (!app._id || !patient._id) {
                    console.warn(`Skipping patient application due to missing _id: app._id=${app._id}, patient._id=${patient._id}. Patient Name: ${patient.name}`);
                    return;
                }
                const schemeDetails = app.schemeId ? { schemeId: app.schemeId._id, schemeName: app.schemeId.name, } : { schemeId: null, schemeName: 'Scheme Deleted/Unavailable' };
                combinedApplications.push({
                    applicationId: app._id, applicantId: patient._id, applicantType: 'patient', applicantName: patient.name,
                    ...schemeDetails, status: app.status, appliedOn: app.appliedOn, documents: app.documents || [],
                    details: { age: patient.age, condition: patient.medicalHistory, bloodGroup: patient.bloodGroup }
                });
            });
        });

        // --- Fetch and process Farmer Applications ---
        const farmersWithApps = await Farmer.find({ 'appliedSchemes.0': { $exists: true } })
            .populate('appliedSchemes.schemeId', 'name description')
            .select('name uniqueId farmLocation landArea cropType annualIncome appliedSchemes._id appliedSchemes.status appliedSchemes.appliedOn appliedSchemes.schemeId appliedSchemes.documents');

        farmersWithApps.forEach(farmer => {
            farmer.appliedSchemes.forEach(app => {
                if (!app._id || !farmer._id) {
                    console.warn(`Skipping farmer application due to missing _id: app._id=${app._id}, farmer._id=${farmer._id}. Farmer Name: ${farmer.name}`);
                    return;
                }
                const schemeDetails = app.schemeId ? { schemeId: app.schemeId._id, schemeName: app.schemeId.name, } : { schemeId: null, schemeName: 'Scheme Deleted/Unavailable' };
                combinedApplications.push({
                    applicationId: app._id, applicantId: farmer._id, applicantType: 'farmer', applicantName: farmer.name,
                    ...schemeDetails, status: app.status, appliedOn: app.appliedOn, documents: app.documents || [],
                    details: { farmLocation: farmer.farmLocation, landArea: farmer.landArea, cropType: farmer.cropType, annualIncome: farmer.annualIncome }
                });
            });
        });

        // --- NEW: Fetch and process Student Applications ---
        const studentsWithApps = await Student.find({ 'appliedSchemes.0': { $exists: true } })
            .populate('appliedSchemes.schemeId', 'name description')
            .select('name uniqueId educationalInstitution courseOfStudy academicYear annualFamilyIncome appliedSchemes._id appliedSchemes.status appliedSchemes.appliedOn appliedSchemes.schemeId appliedSchemes.documents');

        studentsWithApps.forEach(student => {
            student.appliedSchemes.forEach(app => {
                if (!app._id || !student._id) {
                    console.warn(`Skipping student application due to missing _id: app._id=${app._id}, student._id=${student._id}. Student Name: ${student.name}`);
                    return;
                }
                const schemeDetails = app.schemeId ? { schemeId: app.schemeId._id, schemeName: app.schemeId.name, } : { schemeId: null, schemeName: 'Scheme Deleted/Unavailable' };
                combinedApplications.push({
                    applicationId: app._id, applicantId: student._id, applicantType: 'student', applicantName: student.name,
                    ...schemeDetails, status: app.status, appliedOn: app.appliedOn, documents: app.documents || [],
                    details: { // Student-specific details
                        educationalInstitution: student.educationalInstitution,
                        courseOfStudy: student.courseOfStudy,
                        academicYear: student.academicYear,
                        annualFamilyIncome: student.annualFamilyIncome
                    }
                });
            });
        });

        combinedApplications.sort((a, b) => new Date(b.appliedOn) - new Date(a.appliedOn));

        console.log(`Fetched ${combinedApplications.length} total applications for admin.`);
        res.json(combinedApplications);

    } catch (err) {
        console.error("Error fetching all applications for admin:", err);
        res.status(500).json({ message: 'Error fetching applications', error: err.message });
    }
};

// *** REVISED: Update Scheme Application Status (Handles all types: Hospital, Patient, Farmer) ***
exports.updateApplicationStatus = async (req, res) => {
    const { applicantType, applicantId, applicationId, newStatus } = req.body;

    const allowedStatuses = ['approved', 'rejected'];
    // NEW: Add 'farmer' and 'student' to allowedTypes
    const allowedTypes = ['hospital', 'patient', 'farmer', 'student'];

    if (!applicantType || !allowedTypes.includes(applicantType)) { /* ... (unchanged) ... */ }
    if (!applicantId || !mongoose.Types.ObjectId.isValid(applicantId)) { /* ... (unchanged) ... */ }
    if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) { /* ... (unchanged) ... */ }
    if (!newStatus || !allowedStatuses.includes(newStatus)) { /* ... (unchanged) ... */ }

    try {
        let parentDocument = null;
        let Model; // Define a variable to hold the Mongoose model

        // Determine which model to query based on applicantType
        if (applicantType === 'hospital') {
             Model = Hospital;
        } else if (applicantType === 'patient') {
            Model = Patient;
        } else if (applicantType === 'farmer') {
            Model = Farmer;
        } else if (applicantType === 'student') { // <--- NEW: Handle student type
            Model = Student;
        } else {
            return res.status(400).json({ message: 'Unsupported applicant type.' });
        }

        parentDocument = await Model.findOne({
            _id: applicantId,
            'appliedSchemes._id': applicationId
        });

        if (!parentDocument) { /* ... (unchanged) ... */ }
        const application = parentDocument.appliedSchemes.id(applicationId);
        if (!application) { /* ... (unchanged) ... */ }

        application.status = newStatus;
        await parentDocument.save();

        console.log(`Admin updated ${applicantType} application ${applicationId} status to ${newStatus}`);
        res.json({ message: `Scheme application status updated to '${newStatus}' successfully.` });

    } catch (err) {
        console.error(`Error updating ${applicantType} application status for ${applicationId} to ${newStatus}:`, err);
         if (err.name === 'ValidationError') { /* ... (unchanged) ... */ }
        res.status(500).json({ message: 'Error updating application status.', error: err.message });
    }
};