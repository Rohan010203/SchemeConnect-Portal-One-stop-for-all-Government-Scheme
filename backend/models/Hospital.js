// models/Hospital.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const hospitalSchema = new Schema({
    uniqueId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    services: {
        type: [String],
        required: true
    },
    numberOfBeds: {
        type: Number,
        required: true
    },
    numberOfOutpatients: {
        type: Number,
        required: true
    },
    area: {
        type: String,
        required: true
    },
    profilePic: {
        type: String,
        required: true
    },
    verificationDoc: {
        type: String, // Path to the uploaded verification document
        required: true
    },
    password: {
        type: String,
        required: true
    },
    appliedSchemes: [{
        schemeId: {
            type: Schema.Types.ObjectId,
            ref: 'Scheme'
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

module.exports = mongoose.model('Hospital', hospitalSchema);
