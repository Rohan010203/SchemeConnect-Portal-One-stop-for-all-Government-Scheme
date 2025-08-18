const Grievance = require('../models/Grievanance');
const fs = require('fs'); // Node's file system module
const path = require('path'); // Node's path module

// @desc    Submit a new grievance
// @route   POST /api/grievances
// @access  Public
const submitGrievance = async (req, res) => {
  // Multer has already processed the file (if any) by the time this controller runs.
  // File details are available in req.file if upload was successful.
  // req.body contains the text fields.

  try {
    const { name, email, message, userType } = req.body; // Added userType if you plan to add it to the form

    // Basic validation
    if (!name || !email || !message) {
      // If file was uploaded by multer before this validation failed, clean it up
      if (req.file) {
        console.warn(`Validation failed for grievance, cleaning up uploaded file: ${req.file.path}`);
        fs.unlink(req.file.path, (err) => {
          if (err) console.error('Error deleting temp file after validation failure:', err);
        });
      }
      return res.status(400).json({ message: 'Please fill in all required fields (Name, Email, Message).' });
    }

    // Get attachment path if file was successfully uploaded by multer
    // req.file.path contains the full path where multer saved the file
    const attachmentPath = req.file ? req.file.path : null;
     console.log("Attachment path saved:", attachmentPath); // Log the path

    const grievance = new Grievance({
      name,
      email,
      message,
      attachmentPath, // Save the path provided by multer
      userType: userType || 'Other', // Default to 'Other' if not provided
    });

    const createdGrievance = await grievance.save();

    // Send success response
    console.log(`Grievance submitted successfully with ID: ${createdGrievance._id}`);
    res.status(201).json({
      message: `Thank you, ${createdGrievance.name}. Your grievance has been submitted successfully. Your Ticket ID is ${createdGrievance._id}.`,
      grievanceId: createdGrievance._id,
      submittedAt: createdGrievance.submittedAt,
      status: createdGrievance.status,
    });

  } catch (error) {
    console.error('Error submitting grievance:', error);

    // If file was uploaded by multer but database save failed, clean it up
    if (req.file) {
       console.error(`Database save failed for grievance, cleaning up uploaded file: ${req.file.path}`);
       fs.unlink(req.file.path, (err) => {
         if (err) console.error('Error deleting temp file during DB save failure:', err);
       });
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
         const messages = Object.values(error.errors).map(val => val.message);
         return res.status(400).json({ message: `Validation Error: ${messages.join(', ')}` }); // Prepend 'Validation Error'
    }

    // Multer errors are typically handled by the middleware itself
    // but sometimes they can be caught here depending on middleware chain.
    // The `uploadGrievanceAttachment` wrapper will handle most multer errors.
    // If a Multer error was passed via next(error), it might land here.

    // Generic server error
    res.status(500).json({ message: 'Failed to submit grievance due to a server error. Please try again later.' });
  }
};

const getGrievances = async (req, res) => {
  try {
    // Find all grievances, sorted by most recent first
    const grievances = await Grievance.find({}).sort({ submittedAt: -1 });

    res.status(200).json(grievances);
  } catch (error) {
    console.error('Error fetching grievances:', error);
    res.status(500).json({ message: 'Failed to fetch grievances.' });
  }
};

// @desc    Update grievance status
// @route   PATCH /api/grievances/:id/status
// @access  Private (Admin only)
const updateGrievanceStatus = async (req, res) => {
  const { id } = req.params; // Get grievance ID from URL parameters
  const { newStatus } = req.body; // Get the new status from the request body

  // Validate the new status against allowed enum values
  const allowedStatuses = ['Pending', 'In Progress', 'Resolved', 'Closed'];
  if (!allowedStatuses.includes(newStatus)) {
    return res.status(400).json({ message: 'Invalid status provided.' });
  }

  try {
    const grievance = await Grievance.findById(id);

    if (!grievance) {
      return res.status(404).json({ message: 'Grievance not found.' });
    }

    grievance.status = newStatus;
    await grievance.save();

    res.status(200).json({
      message: `Grievance status updated to ${newStatus}`,
      grievance
    });

  } catch (error) {
    console.error(`Error updating grievance ${id} status to ${newStatus}:`, error);
    res.status(500).json({ message: 'Failed to update grievance status.' });
  }
};


module.exports = {
  submitGrievance,
  getGrievances, // Export the new function
  updateGrievanceStatus, // Export the new function
};