const Scheme = require('../models/Scheme');

// Get all schemes
exports.getAllSchemes = async (req, res) => {
    try {
        const schemes = await Scheme.find();
        res.status(200).json(schemes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Create a new scheme
exports.createScheme = async (req, res) => {
    try {
        const scheme = new Scheme(req.body);
        const savedScheme = await scheme.save();
        res.status(201).json(savedScheme);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get a specific scheme by ID
exports.getSchemeById = async (req, res) => {
    try {
        const scheme = await Scheme.findById(req.params.id);
        if (!scheme) {
            return res.status(404).json({ message: 'Scheme not found' });
        }
        res.status(200).json(scheme);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a scheme
exports.updateScheme = async (req, res) => {
    try {
        const scheme = await Scheme.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        if (!scheme) {
            return res.status(404).json({ message: 'Scheme not found' });
        }
        res.status(200).json(scheme);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a scheme
exports.deleteScheme = async (req, res) => {
    try {
        const scheme = await Scheme.findByIdAndDelete(req.params.id);
        if (!scheme) {
            return res.status(404).json({ message: 'Scheme not found' });
        }
        res.status(200).json({ message: 'Scheme deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get schemes for a specific hospital with eligibility matching
exports.getSchemesByHospital = async (req, res) => {
    try {
        const hospitalId = req.params.hospitalId;
        // Get hospital details (this would depend on your hospital model)
        const hospital = await Hospital.findById(hospitalId);
        
        if (!hospital) {
            return res.status(404).json({ message: 'Hospital not found' });
        }
        
        // Get all schemes
        const schemes = await Scheme.find({ target: 'hospital' });
        
        // Filter schemes based on hospital eligibility
        const eligibleSchemes = schemes.filter(scheme => {
            // Check beds eligibility if specified
            if (scheme.eligibilityBeds && hospital.beds < scheme.eligibilityBeds) {
                return false;
            }
            
            // Check location eligibility if specified
            if (scheme.eligibilityLocation && 
                hospital.location !== scheme.eligibilityLocation) {
                return false;
            }
            
            // Check area eligibility if specified
            if (scheme.eligibilityArea && 
                hospital.area !== scheme.eligibilityArea) {
                return false;
            }
            
            return true;
        });
        
        res.status(200).json(eligibleSchemes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get only the applied schemes for a hospital
exports.getAppliedSchemesByHospital = async (req, res) => {
    try {
        const hospitalId = req.params.hospitalId;
        
        // Get all applications for this hospital
        const applications = await Application.find({ hospitalId });
        
        // Get the scheme IDs from applications
        const schemeIds = applications.map(app => app.schemeId);
        
        // Get the schemes
        const schemes = await Scheme.find({ _id: { $in: schemeIds } });
        
        // Add application status to each scheme
        const schemesWithStatus = schemes.map(scheme => {
            const application = applications.find(app => 
                app.schemeId.toString() === scheme._id.toString()
            );
            
            return {
                ...scheme.toObject(),
                applicationStatus: application ? application.status : null,
                applicationId: application ? application._id : null
            };
        });
        
        res.status(200).json(schemesWithStatus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};