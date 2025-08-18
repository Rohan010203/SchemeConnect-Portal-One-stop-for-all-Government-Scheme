// models/Patient.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const patientSchema = new mongoose.Schema({
    uniqueId: {
        type: String,
        required: [true, 'Unique ID is required'],
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
    bloodGroup: {
        type: String,
        required: [true, 'Blood group is required'],
        trim: true
    },
    salary: {
        type: Number,
        required: [true, 'Salary is required'],
        min: [0, 'Salary cannot be negative']
    },
    medicalHistory: {
        type: String,
        required: [true, 'Medical history is required'],
        trim: true
    },
    profilePic: {
        type: String,
        required: [true, 'Profile picture path is required']
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
        // --- ADDED: Documents array for scheme applications ---
        documents: [{
            url: { type: String, required: true }, // Path to the uploaded document
            name: { type: String, default: 'Document' }, // Original file name
            uploadedOn: { type: Date, default: Date.now }
        }]
    }]
}, { timestamps: true });

module.exports = mongoose.model('Patient', patientSchema);