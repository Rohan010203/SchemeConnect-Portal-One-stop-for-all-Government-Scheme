const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const hospitalRoutes = require('./routes/hospitalRoutes');
const patientRoutes = require('./routes/patientRoutes');
const adminRoutes = require('./routes/adminRoutes');
const schemeRoutes = require('./routes/schmeRoutes');
const path = require('path');
const farmerRoutes = require('./routes/farmerRoutes'); 
const studentRoutes = require('./routes/studentRoutes');
const grievanceRoutes = require('./routes/grivenanceRoutes'); // Import the grievance routes

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'YOUR_FRONTEND_URL' : 'http://localhost:3000', // Allow frontend origin
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true // If you need cookies/sessions
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
mongoose.connect('mongodb+srv://varadkodgirwar28:varadkodgirwar28@scheme.xr6qpic.mongodb.net/?retryWrites=true&w=majority&appName=Scheme', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
.catch((err) => console.log(err));

// Routes
app.use('/api/hospital', hospitalRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/admin', adminRoutes); 
app.use('/api/schemes', schemeRoutes);
app.use('/api/farmer', farmerRoutes); 
app.use('/api/student', studentRoutes); 
app.use('/api/grivenance', grievanceRoutes);

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
