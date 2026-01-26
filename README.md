# 🏢 Bode CRM - Real Estate Management System

A modern, professional, and feature-rich Customer Relationship Management (CRM) system built specifically for real estate teams. Built with Next.js, MongoDB, and Tailwind CSS.

## ✨ Features

### Core CRM Features
- **Lead Management**: Create, assign, and track real estate leads with multiple status indicators
- **Lead Statuses**: New → Connected → Negotiation → Closed pipeline
- **Smart Card-Based UI**: Beautiful, responsive lead cards with quick actions
- **Status Color Coding**: Visual indicators for lead status (Blue, Green, Yellow, Purple)

### Admin Dashboard
- **Analytics Overview**: Dashboard with key metrics and performance charts
- **Lead Distribution**: Manually assign leads to sales employees
- **Employee Management**: View and manage all sales team members
- **Commission Management**: Define commission rules and approve/reject commissions
- **System Settings**: Configure office location, attendance radius, and commission percentages
- **Performance Charts**: Line and bar charts showing trends

### Sales Employee Interface
- **Personal Dashboard**: Quick overview of assigned leads and pipeline
- **Lead Cards**: Interactive cards for managing individual leads
- **Call & Email Integration**: Quick action buttons to contact leads
- **Notes Management**: Add and update lead notes
- **Attendance Tracking**: GPS-verified attendance with radius checking
- **Commission Tracking**: View pending and approved commissions

### Attendance System
- **GPS Location Verification**: Employees must be within office radius to mark attendance
- **Automatic Distance Calculation**: Haversine formula for accurate GPS distance
- **Attendance History**: Monthly and daily attendance records
- **Status Indicators**: Visual feedback for within/outside radius attendance

### Commission Management
- **Automatic Calculation**: Commissions calculated based on deal value and percentage
- **Multi-Status Pipeline**: Pending → Approved → Paid workflow
- **Admin Approval**: Admins review and approve commission payouts
- **Employee Tracking**: Sales employees can view their commission status

### Authentication & Authorization
- **Role-Based Access Control**: Admin and Sales Employee roles
- **JWT Token-Based Auth**: Secure session management
- **Protected Routes**: Role-specific dashboards and pages
- **Login/Register System**: Easy onboarding for new users

## 🛠 Tech Stack

- **Frontend**: Next.js 16, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT + bcryptjs
- **UI Components**: Lucide Icons, Recharts for visualizations
- **Location Services**: GPS/Geolocation API

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or Atlas)
- Modern web browser with geolocation support

### Installation

1. **Change to project directory**
```bash
cd /home/yasin/Desktop/bode-crm
```

2. **Install dependencies** (if not already installed)
```bash
npm install
```

3. **Configure environment variables**

The `.env.local` file already exists with default settings. Update it with your MongoDB connection:
```env
MONGODB_URI=mongodb://localhost:27017/bode-crm
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-change-in-production
JWT_SECRET=your-jwt-secret-change-in-production
```

### Running the Application

**Development Mode:**
```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

**Production Build:**
```bash
npm run build
npm start
```

## 📝 Demo Credentials

Create accounts by registering, or use these as reference credentials:

**Admin Account:**
- Email: `admin@example.com`
- Password: `password`

**Sales Employee Account:**
- Email: `sales@example.com`
- Password: `password`

## 🎯 User Workflows

### Admin Workflow
1. Login with admin credentials
2. Navigate to Admin Dashboard to see overview
3. Go to Leads → Create new leads and assign to employees
4. Go to Employees to view sales team
5. Go to Commissions to approve/reject commission payouts
6. Go to Settings to configure office location and commission rules

### Sales Employee Workflow
1. Register or login with your employee account
2. View assigned leads in Sales Dashboard
3. Click on lead cards to update status and add notes
4. Use Call/Email buttons to contact leads
5. Go to Attendance to mark daily attendance (GPS required)
6. Go to Commissions to view earned and pending commissions

## 🔐 Security Features

- **Password Hashing**: bcryptjs with 10 salt rounds
- **JWT Authentication**: Token-based session management
- **Route Protection**: Role-based access control on all routes
- **API Authorization**: Token validation on all API endpoints
- **Environment Variables**: Sensitive data in `.env.local`

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Leads
- `GET /api/leads` - Fetch leads (with optional filters)
- `POST /api/leads` - Create new lead (admin only)
- `GET /api/leads/[id]` - Get specific lead
- `PUT /api/leads/[id]` - Update lead status/notes

### Attendance
- `POST /api/attendance` - Mark attendance (GPS required)
- `GET /api/attendance` - Get attendance history

### Commissions
- `GET /api/commissions` - Get commissions (filtered by role)
- `POST /api/commissions` - Create commission (admin only)
- `PUT /api/commissions/[id]` - Approve/reject commission

### System
- `GET /api/employees` - Get all sales employees (admin only)
- `GET /api/settings` - Get system settings (admin only)
- `PUT /api/settings` - Update system settings (admin only)

## 🎨 UI/UX Highlights

- **Modern Card-Based Design**: Clean, professional interface with cards
- **Color-Coded Status**: Visual indicators for lead status and commission approval
- **Responsive Layout**: Works on desktop, tablet, and mobile devices
- **Loading States**: Spinners for better UX
- **Toast Notifications**: Real-time feedback for user actions
- **Interactive Charts**: Performance visualization
- **Quick Actions**: Call, email, and status update buttons on lead cards

## 📱 Mobile Support

The application is fully responsive and works on:
- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Tablet browsers
- Mobile devices (iOS Safari, Chrome for Android)

GPS attendance requires HTTPS or localhost.

## 🐛 Troubleshooting

**MongoDB Connection Error**
```bash
# If using local MongoDB, start the service:
# Linux/Mac: brew services start mongodb-community
# Windows: net start MongoDB
# Or use MongoDB Atlas (cloud) - update MONGODB_URI
```

**Geolocation Not Working**
- Ensure HTTPS or localhost
- Grant permission when browser asks
- Check browser's location settings

**Build Errors**
```bash
npm install
npm run build
```

## 📚 Database Models

### User
- id, email, password (hashed), name, role, phone, timestamps

### Lead
- id, name, email, phone, property, status, assignedTo (ref), notes, value, timestamps

### Attendance
- id, userId (ref), date, checkInTime, checkOutTime, latitude, longitude, withinRadius, timestamps

### Commission
- id, dealId (ref), employeeId (ref), amount, percentage, status, approvedBy, approvalDate, rejectionReason, timestamps

### SystemSettings
- officeLatitude, officeLongitude, officeName, attendanceRadius, commissionRules array

## 🎓 Key Features Explained

### Lead Management
Leads can be created by admins and assigned to sales employees. Each lead has a status that progresses through the pipeline. Sales employees can update status and add notes directly from lead cards.

### GPS Attendance
When marking attendance, the system calculates the distance between employee location and office location using the Haversine formula. Attendance is only marked if within the configured radius.

### Commission Workflow
When a deal is closed, admins create commissions which are pending. Employees can view pending commissions. Admins review and approve commissions before payout.

### Role-Based Access
- **Admin**: Full access to all features, can manage system
- **Sales**: Access to personal dashboard, leads, and attendance

---

Built with ❤️ for real estate teams | Version 1.0.0 | Last Updated: January 2026
