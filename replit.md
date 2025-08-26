# Overview

SmartRent is Pakistan's first blockchain-powered rental platform that provides secure, transparent, and AI-driven property rentals. The platform enables landlords and tenants to create smart contracts, get AI-powered price suggestions, manage payments, and handle all rental processes with complete legal compliance and trust through blockchain technology.

The system serves three user types: landlords (property owners), tenants (property seekers), and administrators. Key features include property listings with AI price suggestions, smart contract generation, digital payments, document verification, and dispute resolution.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/ui components built on Radix UI primitives with Tailwind CSS for styling
- **State Management**: TanStack Query for server state management and React Context for authentication
- **Routing**: Wouter for client-side routing
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)

## Backend Architecture
- **Framework**: Express.js with TypeScript running on Node.js
- **API Design**: RESTful API with role-based authentication using JWT tokens
- **Authentication**: JWT-based auth with bcrypt for password hashing
- **File Handling**: Multer for file uploads (document verification, property images)
- **Middleware**: Custom authentication middleware with role-based access control

## Database Design
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: PostgreSQL with enum types for user roles, property types, contract statuses, etc.
- **Key Entities**: Users, Properties, Contracts, Payments, Documents, Disputes, Reviews
- **Relationships**: One-to-many between users-properties, properties-contracts, users-payments

## Authentication & Authorization
- **Strategy**: JWT tokens stored in localStorage
- **Roles**: Three-tier role system (landlord, tenant, admin)
- **Verification**: Document-based identity verification system with CNIC uploads
- **Session Management**: Token-based sessions with role-specific route protection

## Data Models
- **Users**: Email/password auth with role-based permissions and verification status
- **Properties**: Comprehensive property data with AI-suggested pricing and availability tracking
- **Contracts**: Digital contract management with status tracking and terms storage
- **Payments**: Payment processing with history and auto-pay functionality
- **Documents**: File upload system for verification and contract documents

## Component Architecture
- **Design System**: Consistent component library using Radix UI primitives
- **Reusable Components**: PropertyCard, SearchFilters, Header/Footer with responsive design
- **Page Components**: Role-specific dashboards and feature-specific pages
- **Form Handling**: React Hook Form with Zod validation schemas

## Development Workflow
- **Build Process**: Separate client and server builds with ESM modules
- **Development**: Hot reload with Vite dev server and Express backend
- **Type Safety**: Shared TypeScript types between client and server via shared directory

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL database with connection pooling
- **Environment**: DATABASE_URL required for database connectivity

## UI Components & Styling
- **Radix UI**: Complete primitive component library for accessible UI components
- **Tailwind CSS**: Utility-first CSS framework with PostCSS processing
- **Lucide React**: Icon library for consistent iconography

## Development Tools
- **Vite**: Frontend build tool with HMR and React plugin
- **TypeScript**: Type safety across the entire stack
- **ESBuild**: Fast JavaScript bundler for production builds

## Authentication & Security
- **bcrypt**: Password hashing for secure authentication
- **jsonwebtoken**: JWT token generation and verification
- **connect-pg-simple**: PostgreSQL session store for Express sessions

## File Processing
- **Multer**: Multipart form data handling for file uploads
- **Node.js fs**: File system operations for document storage

## Validation & Data Processing
- **Zod**: Runtime type validation and schema parsing
- **date-fns**: Date manipulation and formatting utilities
- **Drizzle Zod**: Integration between Drizzle ORM and Zod validation

## Development Environment
- **Replit Integration**: Vite plugins for Replit development environment
- **WebSocket Support**: ws library for Neon database connections
- **Node.js**: Runtime environment with ES modules support