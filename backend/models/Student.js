const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const studentSchema = new mongoose.Schema({
    uniqueId: {
        type: String,
        required: [true, 'Unique Student ID is required'],
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    age: {
        type: Number,
        required: [true, 'Age is required'],
        min: [0, 'Age cannot be negative']
    },
    educationalInstitution: { // School/College name
        type: String,
        required: [true, 'Educational institution is required'],
        trim: true
    },
    courseOfStudy: { // e.g., B.Tech, MBBS, Class 12
        type: String,
        required: [true, 'Course of study is required'],
        trim: true
    },
    academicYear: { // e.g., 2024-2025, 3rd Year
        type: String,
        required: [true, 'Academic year is required'],
        trim: true
    },
    annualFamilyIncome: { // For income-based scholarship/health schemes
        type: Number,
        required: [true, 'Annual family income is required'],
        min: [0, 'Annual family income cannot be negative']
    },
    profilePic: {
        type: String,
        required: [true, 'Profile picture path is required']
    },
    institutionIDCard: { // Student ID card for verification
        type: String,
        required: [true, 'Institution ID card document path is required']
    },
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    appliedSchemes: [{
        schemeId: {
            type: Schema.Types.ObjectId,
            ref: 'Scheme',
            required: true
        },
        status: {
            type: String,
            enum: ['approved', 'not-approved', 'rejected'],
            default: 'not-approved'
        },
        appliedOn: {
            type: Date,
            default: Date.now
        },
        documents: [{ // Documents submitted for this specific scheme application
            url: { type: String, required: true },
            name: { type: String, default: 'Document' },
            uploadedOn: { type: Date, default: Date.now }
        }]
    }]
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);