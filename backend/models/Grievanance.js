const mongoose = require('mongoose');

const grievanceSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/.+@.+\..+/, 'Please fill a valid email address'],
    },
    message: {
      type: String,
      required: true,
    },
    // Store path or filename of the attachment relative to the project root or uploads dir
    // The path stored here should be accessible later if needed (e.g., for admin view)
    attachmentPath: {
      type: String,
      required: false, // Attachment is optional
    },
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Resolved', 'Closed'],
      default: 'Pending',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    // Optional: To store user type if not logged in (useful for filtering later)
    userType: {
        type: String,
        required: false, // Depends if you capture this on form
        enum: ['Patient', 'Provider', 'Farmer', 'Student', 'Admin', 'Other']
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields
  }
);

const Grievance = mongoose.model('Grievance', grievanceSchema);

module.exports = Grievance;