// models/Farmer.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const farmerSchema = new mongoose.Schema({
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
    farmLocation: { // Specific to farmer
        type: String,
        required: [true, 'Farm location is required'],
        trim: true
    },
    landArea: { // Specific to farmer (e.g., in acres, hectares)
        type: Number,
        required: [true, 'Land area is required'],
        min: [0, 'Land area cannot be negative']
    },
    cropType: { // Specific to farmer
        type: String,
        required: [true, 'Crop type is required'],
        trim: true
    },
    annualIncome: { // Specific to farmer
        type: Number,
        required: [true, 'Annual income is required'],
        min: [0, 'Annual income cannot be negative']
    },
    profilePic: {
        type: String,
        required: [true, 'Profile picture path is required']
    },
    aadhaarCard: { // Specific to farmer, for verification
        type: String,
        required: [true, 'Aadhaar card document path is required']
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

module.exports = mongoose.model('Farmer', farmerSchema);