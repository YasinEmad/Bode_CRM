# Bode CRM

A comprehensive real estate sales management system built with Next.js, designed to streamline lead management, deal closing, commission tracking, and team performance for real estate sales organizations.

## 🚀 Features

### Core Functionality
- **Lead Management**: Complete lead lifecycle from creation to closure with status tracking
- **Deal Closing**: Record detailed real estate transactions with contract information
- **Commission Management**: Multi-recipient commission system with approval workflows
- **GPS-Based Attendance**: High-accuracy location validation for employee check-ins
- **Team Management**: Hierarchical team structure with leaders and members
- **Performance Tracking**: KPI-based performance metrics with daily/monthly reporting

### User Roles
- **Admin**: Full system access, user management, commission approval, system configuration
- **Sales Representatives**: Lead management, deal closing, attendance tracking
- **Team Leaders**: Team oversight, performance monitoring, communication
- **Media Buyers**: Specialized marketing role

### Advanced Features
- **Real-Time Notifications**: Web push notifications for lead assignments and updates
- **Internal Messaging**: One-to-one communication between team members
- **Audit Logging**: Comprehensive admin action tracking for compliance
- **Excel Export**: Data export capabilities for reporting
- **Mobile-Responsive**: Optimized for desktop and mobile devices
- **GPS Accuracy Validation**: Multi-level accuracy checking (Excellent <10m, Good <30m, etc.)

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 16.1.4 with React 19.2.3
- **Styling**: Tailwind CSS 4
- **State Management**: React Context API
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **Maps**: Leaflet with React Leaflet
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js 18+
- **API**: Next.js API Routes (Serverless)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with bcryptjs hashing
- **Push Notifications**: Web Push API
- **File Uploads**: Built-in Next.js handling

### Development Tools
- **TypeScript**: Full type safety
- **ESLint**: Code linting and formatting
- **Vercel Speed Insights**: Performance monitoring

## 📋 Prerequisites

- Node.js 18 or higher
- MongoDB database (local or cloud)
- npm or pnpm package manager

## 🚀 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bode-crm
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**

   Create a `.env.local` file in the project root with the following variables:

   ```env
   MONGODB_URI=mongodb://localhost:27017/bode-crm
   # Or for MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/bode-crm

   # Push notification keys (optional, for web push notifications)
   VAPID_PUBLIC_KEY=your-public-key
   VAPID_PRIVATE_KEY=your-private-key
   ```

4. **Database Setup**

   The application will automatically create collections and indexes on first run. For production, ensure your MongoDB instance is properly configured and secured.

5. **Development Server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

6. **Production Build**
   ```bash
   npm run build
   npm run start
   ```

## 📖 Usage

### First-Time Setup
1. Access the application at `http://localhost:3000`
2. Create an admin user through the registration process
3. Configure system settings (office location, attendance times, etc.)
4. Create teams and add employees
5. Set up KPI configurations for performance tracking

### Daily Operations
- **Employees**: Check in using GPS-validated attendance
- **Sales Reps**: Manage assigned leads, update statuses, close deals
- **Team Leaders**: Monitor team performance, approve communications
- **Admins**: Review commissions, generate reports, manage users

### Key Workflows
1. **Lead Management**: Create → Assign → Connect → Negotiate → Close
2. **Deal Processing**: Record deal → Generate commission → Admin approval → Payment
3. **Attendance**: GPS check-in → Location validation → Record attendance
4. **Performance**: Daily input → Monthly aggregation → KPI calculation

## 📚 Documentation

- **[Setup Guide](docs/SETUP.md)**: Detailed installation and configuration
- **[Project Structure](docs/PROJECT_STRUCTURE.md)**: Codebase organization
- **[API Documentation](docs/API.md)**: Complete API reference
- **[Contributing Guide](docs/CONTRIBUTING.md)**: Development guidelines
- **[GPS Improvements](docs/GPS_IMPROVEMENTS.md)**: Location tracking enhancements
- **[Hosting Analysis](docs/HOSTING_COST_ANALYSIS.md)**: Deployment and cost considerations

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Create production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run reset-db     # Reset database (development only)
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature-name`
3. Make your changes with proper TypeScript types
4. Test thoroughly (GPS features, commission calculations, etc.)
5. Submit a pull request with a clear description

### Code Standards
- Use TypeScript for all new code
- Follow existing naming conventions
- Add proper error handling
- Update documentation for API changes
- Test GPS and location features on actual devices

## 📊 System Requirements

### Minimum Hardware
- **RAM**: 512MB
- **Storage**: 1GB available space
- **Network**: Stable internet for GPS validation

### Recommended Hardware
- **RAM**: 1GB+
- **Storage**: 2GB+ for database and logs
- **GPS**: Device with accurate location services

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🔒 Security

- JWT-based authentication with secure token handling
- Password hashing using bcryptjs
- GPS location validation prevents spoofing
- Admin action auditing for compliance
- Input validation with Zod schemas
- CORS configuration for API security

## 📈 Performance

- Serverless API architecture for scalability
- Optimized MongoDB queries with proper indexing
- GPS accuracy validation (30m threshold)
- Real-time notifications via Server-Sent Events
- Vercel edge network for global performance

## 🐛 Troubleshooting

### Common Issues
- **GPS Accuracy**: Ensure device GPS is enabled and has clear sky view
- **Database Connection**: Verify MongoDB URI and network access
- **Build Errors**: Clear node_modules and reinstall dependencies
- **Push Notifications**: Check VAPID keys configuration

### Debug Tools
- `/api/debug/validate-location`: Test GPS coordinate validation
- `/api/debug/commission-check`: Verify commission calculations
- Admin logs page: View system audit trail

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋 Support

For support and questions:
- Check the documentation in the `docs/` folder
- Review existing issues on GitHub
- Create a new issue for bugs or feature requests

## 🗺️ Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Integration with property listing APIs
- [ ] Automated lead scoring
- [ ] Calendar integration for meetings
- [ ] Enhanced reporting with data visualization

---

**Built with ❤️ for real estate sales teams worldwide**
