const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String },
    description: { type: String },
    target: {
        type: String,
        enum: ['hospital', 'patient', 'farmer', 'student'], // <--- ADD 'student' here
        required: true
    },
    referenceLink: { type: String },

    // Fields for hospital target
    eligibilityBeds: { type: Number },
    eligibilityLocation: { type: String },
    eligibilityArea: { type: String },

    // Fields for patient target
    eligibilityAge: { type: Number },
    eligibilityCondition: { type: String },
    patientEligibility: { type: String },

    // Fields for farmer target
    eligibilityLandArea: { type: Number },
    eligibilityCropType: { type: String },
    eligibilityAnnualIncome: { type: Number },

    // --- NEW: Fields for student target ---
    eligibilityMinimumGPA: { type: Number }, // e.g., minimum GPA/percentage
    eligibilityCourseType: { type: String }, // e.g., 'Science', 'Engineering', 'Medical'
    eligibilityAnnualFamilyIncome: { type: Number } // Maximum annual family income for financial aid schemes
    // ------------------------------------

}, { timestamps: true });

module.exports = mongoose.model('Scheme', schemeSchema);