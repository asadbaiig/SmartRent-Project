# SmartRent Project - Introduction

## 1. Project Overview

**SmartRent** is a comprehensive property rental management platform designed to streamline the rental process for landlords, tenants, and administrators. The platform facilitates property listing, contract management, payment tracking, document verification, and dispute resolution in a unified digital ecosystem.

### Technology Stack

**Frontend:**
- React 18.3.1 with TypeScript
- Vite (Build Tool)
- Tailwind CSS + shadcn/ui components
- React Query (Data Fetching)
- Wouter (Routing)
- Framer Motion (Animations)
- Leaflet (Maps Integration)

**Backend:**
- Express.js with TypeScript
- Firebase Authentication
- Firebase Firestore
- MongoDB with Mongoose
- Multer (File Upload)
- Zod (Validation)

**Infrastructure:**
- Hybrid Database Architecture
  - MongoDB: Properties & Documents
  - Firebase Firestore: Users, Contracts, Payments, Disputes

---

## 2. Project Scope

The SmartRent platform covers the complete rental lifecycle from property discovery to contract management and payment processing. The current implementation includes:

### 2.1 Core Features Implemented

1. **User Authentication & Authorization**
   - Firebase-based authentication system
   - Role-based access control (Landlord, Tenant, Admin)
   - User registration and login
   - Session management
   - User profile management

2. **Property Management**
   - Property listing with comprehensive details
   - Multiple image uploads (up to 10 images)
   - Property search and filtering
   - Property details viewing
   - Property CRUD operations
   - AI-powered price suggestions
   - Map integration with coordinates

3. **Contract Management**
   - Digital contract creation
   - Contract status tracking (draft, active, expired, terminated)
   - Contract viewing and updates
   - Blockchain hash support (prepared)
   - Digital signature support (prepared)

4. **Payment Management**
   - Payment tracking and history
   - Payment status management (pending, paid, overdue, failed)
   - Due date tracking
   - Payment method recording
   - Transaction history

5. **Document Management**
   - Document upload and storage
   - Document verification system
   - Multiple document types support (CNIC, bank statements, etc.)
   - Property and contract-linked documents

6. **Dispute Resolution**
   - Dispute creation and tracking
   - Dispute status management (open, in_progress, resolved, closed)
   - Evidence attachment
   - Resolution tracking

7. **Dashboard & Analytics**
   - Role-specific dashboards
   - Statistics and metrics
   - Analytics charts
   - Quick access to key features

8. **Admin Panel**
   - User verification management
   - User role management
   - System-wide statistics
   - User administration

---

## 3. Modules Covered

### 3.1 Authentication Module

**Features:**
- User registration with role selection
- Email/password authentication via Firebase
- JWT token-based session management
- Protected routes and role-based access
- User profile management

**Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/signout` - User sign out
- `GET /api/auth/me` - Get current user

**Pages:**
- `/login` - Login page
- `/register` - Registration page
- `/verification` - Document verification page

---

### 3.2 Property Management Module

**Features:**
- Property listing with full details:
  - Basic information (title, description, address)
  - Location (city, area, coordinates)
  - Property specifications (bedrooms, bathrooms, sqft)
  - Pricing (monthly rent, security deposit)
  - Property type (apartment, house, commercial, office)
  - Amenities array
  - Multiple images (up to 10)
  - Availability status
- Property search and filtering:
  - Filter by city
  - Filter by property type
  - Filter by bedrooms
  - Filter by rent range (min/max)
  - Filter by availability
- AI price suggestion integration
- Map view integration
- Property CRUD operations

**Database:** MongoDB Collection `properties`

**Endpoints:**
- `GET /api/properties` - Get all properties (with filters)
- `GET /api/properties/:id` - Get property by ID
- `POST /api/properties` - Create property (Landlord only)
- `PUT /api/properties/:id` - Update property (Landlord only)
- `DELETE /api/properties/:id` - Delete property (Landlord only)
- `POST /api/dev/seed/properties` - Seed properties from dataset

**Pages:**
- `/properties` - Property listing and search
- `/properties/:id` - Property details
- `/list-property` - Property listing form (Landlord)

**Storage:**
- Property data: MongoDB
- Images: Local file system (`uploads/` folder)

---

### 3.3 Contract Management Module

**Features:**
- Digital contract creation
- Contract linking to properties and users
- Contract status management
- Contract terms (JSON format)
- Start and end date tracking
- Monthly rent and security deposit tracking
- Blockchain hash support (schema ready)
- Digital signature support (schema ready)

**Database:** Firebase Firestore Collection `contracts`

**Endpoints:**
- `GET /api/contracts` - Get contracts (filtered by role)
- `POST /api/contracts` - Create contract (Landlord only)
- `PUT /api/contracts/:id` - Update contract

**Pages:**
- `/contracts` - Contract management page

---

### 3.4 Payment Management Module

**Features:**
- Payment tracking per contract
- Payment status tracking
- Due date and paid date management
- Payment method recording
- Transaction ID tracking
- Payment history viewing
- Filtering by contract, tenant, or landlord

**Database:** Firebase Firestore Collection `payments`

**Endpoints:**
- `GET /api/payments` - Get payments (filtered by role)
- `POST /api/payments` - Create payment
- `PUT /api/payments/:id` - Update payment status

**Pages:**
- `/payments` - Payment management page

---

### 3.5 Document Management Module

**Features:**
- Document upload functionality
- Document type categorization
- Document linking to users, properties, and contracts
- Document verification status
- File metadata tracking (size, mime type)
- Document retrieval by user, property, or contract

**Database:** MongoDB Collection `documents`

**Endpoints:**
- `POST /api/documents` - Upload document
- `GET /api/documents` - Get documents (with filters)
- `GET /api/documents/property/:propertyId` - Get documents by property

**Storage:**
- Document metadata: MongoDB
- Document files: Local file system (`uploads/` folder)

---

### 3.6 Dispute Resolution Module

**Features:**
- Dispute creation
- Dispute linking to contracts
- Dispute status tracking
- Evidence attachment (JSON format)
- Resolution tracking
- Admin resolution support

**Database:** Firebase Firestore Collection `disputes`

**Endpoints:**
- `GET /api/disputes` - Get disputes
- `POST /api/disputes` - Create dispute

---

### 3.7 Dashboard Module

**Features:**
- Role-specific dashboards:
  - **Landlord Dashboard:**
    - Total properties count
    - Active contracts count
    - Total rent revenue
    - Monthly revenue
    - Property analytics charts
    - Quick actions (List Property, View Properties)
  
  - **Tenant Dashboard:**
    - Active contracts count
    - Total payments count
    - Overdue payments count
    - Quick actions (View Contracts, Make Payment)
  
  - **Admin Dashboard:**
    - Total users count
    - Total properties count
    - Total contracts count
    - System-wide statistics
    - User verification management

**Endpoints:**
- `GET /api/dashboard/stats` - Get dashboard statistics

**Pages:**
- `/dashboard` - Main dashboard page (role-based view)

---

### 3.8 Admin Panel Module

**Features:**
- User verification management
- User role management
- System-wide user listing
- User verification status updates

**Endpoints:**
- `GET /api/admin/users` - Get all users (Admin only)
- `PUT /api/admin/users/:id/verification` - Update user verification status (Admin only)

---

### 3.9 File Upload Module

**Features:**
- Image upload for properties
- Document upload for verification
- File validation (type and size)
- Secure file storage
- Image preview functionality
- Multiple file upload support

**Endpoints:**
- `POST /api/upload/image` - Upload image (authenticated)
- `POST /api/documents` - Upload document (authenticated)

**Storage:**
- Files stored in `uploads/` directory
- Served statically via Express

---

## 4. Database Schema

### 4.1 MongoDB Collections

#### Properties Collection
- Property details with full specifications
- Linked to landlord via `landlordId`
- Indexed fields: `landlordId`, `city`, `propertyType`, `isAvailable`
- Compound indexes for optimized queries

#### Documents Collection
- Document metadata and file references
- Linked to users, properties, and contracts
- Indexed fields: `userId`, `propertyId`, `contractId`

### 4.2 Firebase Firestore Collections

#### Users Collection
- User profiles with authentication data
- Role-based access control
- Verification status tracking

#### Contracts Collection
- Digital rental contracts
- Status tracking and lifecycle management
- Linked to properties, landlords, and tenants

#### Payments Collection
- Payment records and history
- Status tracking and date management
- Linked to contracts and users

#### Disputes Collection
- Dispute records and resolutions
- Status tracking and evidence storage
- Linked to contracts and users

---

## 5. User Roles & Permissions

### 5.1 Landlord
- **Permissions:**
  - List and manage properties
  - Create and manage contracts
  - View property-related payments
  - Upload property documents
  - View dashboard statistics

### 5.2 Tenant
- **Permissions:**
  - Browse and search properties
  - View property details
  - View assigned contracts
  - View and manage payments
  - Upload verification documents
  - Create disputes

### 5.3 Admin
- **Permissions:**
  - All landlord and tenant permissions
  - User verification management
  - System-wide statistics access
  - User administration
  - Dispute resolution

---

## 6. Key Features & Highlights

### 6.1 AI Integration
- AI-powered price suggestion based on property characteristics
- Integration with property listing form

### 6.2 Map Integration
- Leaflet-based map view
- Property location visualization
- Coordinate-based property positioning

### 6.3 Responsive Design
- Mobile-first approach
- Tailwind CSS for styling
- shadcn/ui component library
- Dark mode support

### 6.4 Security Features
- Firebase Authentication
- JWT token-based session management
- Role-based access control
- File upload validation
- Input validation with Zod

### 6.5 Data Validation
- Schema validation with Zod
- Type safety with TypeScript
- Input sanitization
- Error handling and validation

---

## 7. Project Structure

```
SmartRent-Project/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom React hooks
│   │   └── lib/               # Utilities and helpers
│   └── index.html
│
├── server/                    # Backend Express application
│   ├── routes.ts              # API routes
│   ├── firebase-auth.ts       # Firebase authentication
│   ├── firebase-storage.ts    # Firebase Firestore operations
│   ├── mongodb.ts             # MongoDB connection
│   ├── mongodb-models.ts      # MongoDB schemas
│   ├── mongodb-storage.ts     # MongoDB operations
│   └── index.ts               # Server entry point
│
├── shared/                    # Shared types and schemas
│   └── schema.ts              # Database schemas and types
│
├── uploads/                   # Uploaded files storage
└── server/dataset/            # Property dataset for seeding
```

---

## 8. Current Implementation Status

### ✅ Completed Modules
- [x] Authentication & Authorization
- [x] Property Management (CRUD)
- [x] Property Search & Filtering
- [x] Contract Management
- [x] Payment Tracking
- [x] Document Upload & Management
- [x] Dispute Resolution
- [x] Dashboard (All Roles)
- [x] Admin Panel
- [x] File Upload System
- [x] AI Price Suggestion
- [x] Map Integration

### 🚧 Partially Implemented
- [ ] Blockchain Integration (Schema ready, implementation pending)
- [ ] Digital Signature (Schema ready, implementation pending)
- [ ] Automated Payment Processing
- [ ] Email Notifications
- [ ] SMS Notifications
- [ ] Review System (Schema defined, implementation pending)

### 📋 Future Enhancements
- [ ] Advanced Search with AI
- [ ] Property Favorites/Wishlist
- [ ] Virtual Tour Integration
- [ ] Real-time Chat/Messaging
- [ ] Payment Gateway Integration
- [ ] Automated Contract Generation
- [ ] Advanced Analytics & Reporting
- [ ] Mobile App Development

---

## 9. Technical Architecture

### 9.1 Frontend Architecture
- **Component-Based:** React functional components with hooks
- **State Management:** React Query for server state, Context API for auth
- **Routing:** Wouter for client-side routing
- **Styling:** Tailwind CSS with utility classes
- **Forms:** React Hook Form with Zod validation

### 9.2 Backend Architecture
- **RESTful API:** Express.js with TypeScript
- **Authentication:** Firebase Authentication
- **Database:** Hybrid approach (MongoDB + Firebase Firestore)
- **File Storage:** Local file system (with cloud migration ready)
- **Validation:** Zod schema validation

### 9.3 Database Architecture
- **MongoDB:** Document-based storage for properties and documents
- **Firebase Firestore:** NoSQL database for users, contracts, payments, disputes
- **Indexing:** Optimized indexes for query performance

---

## 10. API Endpoints Summary

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/signout` - User sign out
- `GET /api/auth/me` - Get current user

### Property Endpoints
- `GET /api/properties` - List properties (with filters)
- `GET /api/properties/:id` - Get property details
- `POST /api/properties` - Create property (Landlord)
- `PUT /api/properties/:id` - Update property (Landlord)
- `DELETE /api/properties/:id` - Delete property (Landlord)

### Contract Endpoints
- `GET /api/contracts` - List contracts
- `POST /api/contracts` - Create contract (Landlord)
- `PUT /api/contracts/:id` - Update contract

### Payment Endpoints
- `GET /api/payments` - List payments
- `POST /api/payments` - Create payment
- `PUT /api/payments/:id` - Update payment

### Document Endpoints
- `POST /api/documents` - Upload document
- `GET /api/documents` - List documents
- `GET /api/documents/property/:propertyId` - Get property documents

### Admin Endpoints
- `GET /api/admin/users` - List all users (Admin)
- `PUT /api/admin/users/:id/verification` - Update verification (Admin)

### Other Endpoints
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/disputes` - List disputes
- `POST /api/disputes` - Create dispute
- `POST /api/upload/image` - Upload image

---

## 11. Security Features

- Firebase Authentication for secure user management
- JWT token-based session management
- Role-based access control (RBAC)
- Input validation and sanitization
- File upload validation (type and size)
- Protected API routes with authentication middleware
- CORS configuration
- Error handling and logging

---

## 12. Development & Deployment

### Development
- Development server: `npm run dev`
- Port: 5002
- Hot module replacement enabled
- TypeScript type checking

### Build
- Production build: `npm run build`
- Type checking: `npm run check`

### Database Setup
- MongoDB: Local or Atlas cloud connection
- Firebase: Project configuration required
- Environment variables: `.env` file for configuration

---

## 13. Conclusion

The SmartRent project currently covers comprehensive property rental management functionality with a modern tech stack, hybrid database architecture, and role-based access control. The platform successfully handles property listing, contract management, payment tracking, document management, and dispute resolution, providing a solid foundation for a complete rental management ecosystem.

The modular architecture allows for easy extension and enhancement of features, with prepared schemas for future implementations like blockchain integration, digital signatures, and automated payment processing.

---

**Last Updated:** Current Implementation Status
**Version:** 1.0.0
**Status:** Core Features Complete


