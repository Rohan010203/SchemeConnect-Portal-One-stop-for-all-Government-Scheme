Scheme Connect Portal is a unified platform that helps users discover, apply for, and track government schemes based on their eligibility. It improves access, transparency, and efficiency for beneficiaries like farmers, students, and patients

## 🚀 Features

### 👤 User Features
- Secure Register/Login  
- Personalized Scheme Recommendations (AI-driven)  
- Apply for Schemes & Upload Documents  
- Track Application Status in Real-Time  
- File Grievances via Chatbot/Human Support  
- Receive Notifications & Alerts

### 🛠 Admin Features
- Add / Edit / Approve / Reject Schemes  
- Monitor User Applications & Engagement  
- Analytics Dashboard  
- Grievance Management  
- Broadcast Notifications

## 🏗 System Architecture

| Layer        | Technology Used |
|-------------|-----------------|
| Frontend     | React.js        |
| Backend      | Node.js + Express.js |
| Database     | MongoDB |
| Authentication | JWT / OTP-based Security |
| File Handling | Multer for Uploads |

---

## 📦 Project Setup

### ✅ Prerequisites
- Node.js & npm installed
- MongoDB (local or cloud instance)
- Git (optional)

### ⚙️ Installation

```bash
# Clone the repository
git clone <repository-url>
cd connect-portal

# Backend Setup
cd backend
npm install
node server.js   # or nodemon server.js

# Frontend Setup
cd frontend
npm install
npm start

📂 Folder Structure
├── backend
│   ├── routes
│   ├── models
│   ├── controllers
│   ├── uploads
│   └── server.js
├── frontend
│   ├── public
│   ├── src
│   │   ├── Pages
│   │   ├── Components
│   │   ├── App.js
│   │   └── index.js
