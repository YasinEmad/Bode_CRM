# Authentication Documentation

## Overview

This document provides comprehensive details about the authentication system implemented in the Bode CRM application. The system uses JWT (JSON Web Tokens) for session management, bcrypt for password hashing, and a context-based approach for state management on the client side.

## Table of Contents

1. [Architecture](#architecture)
2. [Technology Stack](#technology-stack)
3. [Components](#components)
4. [Authentication Flow](#authentication-flow)
5. [API Endpoints](#api-endpoints)
6. [User Model](#user-model)
7. [Configuration](#configuration)
8. [Security Practices](#security-practices)
9. [Usage Examples](#usage-examples)
10. [Error Handling](#error-handling)
11. [Troubleshooting](#troubleshooting)

---

## Architecture

The authentication system is built on a **JWT-based token authentication** model with the following layers:

```
┌─────────────────────────────────────────────┐
│          Client (React/Next.js)            │
│  (Login Page, AuthContext, useAuth Hook)   │
└──────────────┬──────────────────────────────┘
               │
               ├─→ POST /api/auth/login
               ├─→ POST /api/auth/logout
               ├─→ GET /api/auth/me
               └─→ Middleware Protection
               │
┌──────────────▼──────────────────────────────┐
│          Backend (Next.js API Routes)       │
│  (Password verification, Token generation)  │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│          Database (MongoDB)                 │
│  (User collection with hashed passwords)    │
└─────────────────────────────────────────────┘
```

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Password Hashing | bcryptjs | Secure password storage with salt rounds |
| Token Management | jsonwebtoken (JWT) | Session tokens with expiration |
| Client State | React Context API | Global authentication state |
| Storage | localStorage | Persisting tokens and user data |
| Middleware | Next.js Middleware | Route protection at the server level |
| Database | MongoDB | User data persistence |
| Runtime | Next.js 13+ | Server-side rendering and API routes |

---

## Components

### 1. Authentication Utilities (`src/lib/auth.ts`)

Core authentication functions:

#### `hashPassword(password: string): Promise<string>`
- **Purpose**: Hashes a password using bcrypt
- **Parameters**: 
  - `password`: Plain text password to hash
- **Returns**: Promise resolving to hashed password
- **Salt Rounds**: 10 (security level)
- **Usage**:
```typescript
const hashedPassword = await hashPassword('user-password');
```

#### `verifyPassword(password: string, hashedPassword: string): Promise<boolean>`
- **Purpose**: Compares a plain password with a hashed password
- **Parameters**:
  - `password`: Plain text password from user input
  - `hashedPassword`: Hashed password from database
- **Returns**: Promise resolving to true if passwords match
- **Usage**:
```typescript
const isValid = await verifyPassword('user-password', storedHash);
```

#### `signToken(payload: any): string`
- **Purpose**: Creates a signed JWT token
- **Parameters**: 
  - `payload`: Data to include in token (e.g., userId, role)
- **Returns**: Signed JWT token string
- **Expiration**: 7 days
- **Usage**:
```typescript
const token = signToken({ userId: user._id, role: user.role });
```

#### `verifyToken(token: string): any`
- **Purpose**: Verifies and decodes a JWT token
- **Parameters**: 
  - `token`: JWT token string to verify
- **Returns**: Token payload object or null if invalid
- **Usage**:
```typescript
const payload = verifyToken(token);
if (payload) {
  console.log('User ID:', payload.userId);
}
```

#### `generateSessionToken(userId: string, role: string): string`
- **Purpose**: Generates a session token for authenticated users
- **Parameters**:
  - `userId`: MongoDB user document ID
  - `role`: User role ('admin' or 'sales')
- **Returns**: Signed JWT token
- **Token Structure**: `{ userId, role, type: 'session' }`
- **Usage**:
```typescript
const token = generateSessionToken(user._id.toString(), user.role);
```

### 2. AuthContext (`src/context/AuthContext.tsx`)

Client-side authentication state management using React Context API.

#### Context Interface

```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}
```

#### User Interface

```typescript
interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'sales';
}
```

#### AuthProvider Component

**Purpose**: Wraps the application to provide authentication context globally

**Features**:
- Initializes from localStorage on app load
- Manages login/logout operations
- Maintains token and user state
- Provides loading state during initialization

**Key Methods**:

- **`login(username: string, password: string): Promise<void>`**
  - Authenticates user with credentials
  - Stores token and user in localStorage
  - Updates context state
  - Throws error if credentials are invalid

- **`logout(): void`**
  - Clears token and user state
  - Removes data from localStorage
  - Redirects to login page (handled by component)

**Usage**:
```typescript
import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
```

### 3. useAuth Hook (`src/hooks/useAuth.ts`)

Custom React hook for accessing authentication context.

**Purpose**: Provides a type-safe way to access auth state in components

**Returns**: AuthContextType object with user, token, loading, login, and logout

**Usage**:
```typescript
import { useAuth } from '@/hooks/useAuth';

export function MyComponent() {
  const { user, token, loading, login, logout } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;
  
  return <div>Welcome, {user.name}</div>;
}
```

**Error Handling**: Throws error if used outside AuthProvider

### 4. User Model (`src/models/User.ts`)

MongoDB schema for user documents.

#### User Interface

```typescript
interface IUser extends Document {
  username: string;
  email?: string;
  password: string;
  name: string;
  role: 'admin' | 'sales';
  phone?: string;
  position?: string;
  salary?: number;
  deviceId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Schema Validation

| Field | Type | Required | Unique | Notes |
|-------|------|----------|--------|-------|
| username | String | Yes | Yes | Trimmed, lowercased |
| email | String | No | No | Email format validation |
| password | String | Yes | No | Must be hashed before storage |
| name | String | Yes | No | User's full name |
| role | String | Yes | No | Enum: 'admin' or 'sales' |
| phone | String | No | No | Phone number |
| position | String | No | No | Job position (e.g., "Sales Senior") |
| salary | Number | No | No | Monthly salary in currency units |
| deviceId | String | No | No | Device ID for mobile check-ins |
| createdAt | Date | Auto | No | Timestamp of creation |
| updatedAt | Date | Auto | No | Timestamp of last update |

### 5. Route Protection Middleware (`src/middleware.ts`)

Server-side middleware for protecting routes.

**Protected Routes**: `/admin/*` and `/sales/*`

**Public Routes**: `/`, `/login`, `/register`, `/api/*`, `/_next/*`, `/public/*`

**Behavior**:
- Checks for token cookie on protected routes
- Redirects to login if token is missing
- Preserves redirect URL via `next` query parameter
- Allows API routes and public assets to pass through

**Note**: Token verification is NOT performed at middleware level (to avoid Edge runtime limitations with jsonwebtoken). Full verification happens at API route level.

---

## Authentication Flow

### Login Flow

```
1. User enters credentials on login page
   ↓
2. Client submits POST request to /api/auth/login
   ├─ Headers: Content-Type: application/json
   └─ Body: { username, password }
   ↓
3. Backend validates request
   ├─ Check username and password provided
   ├─ Find user in database
   ├─ Verify password using bcrypt comparison
   └─ Return error if any validation fails
   ↓
4. Generate JWT token
   └─ Payload: { userId, role, type: 'session' }
   ↓
5. Send success response with token and user data
   └─ Response: { success: true, token, user: { id, username, name, role } }
   ↓
6. Client stores token and user in:
   ├─ localStorage (persistent across page reloads)
   └─ AuthContext state (immediate access)
   ↓
7. Middleware sets token cookie for route protection
   ↓
8. User is redirected to dashboard
```

### Logout Flow

```
1. User clicks logout button
   ↓
2. Client calls logout() from useAuth hook
   ↓
3. Clear AuthContext state
   ├─ Set user: null
   └─ Set token: null
   ↓
4. Clear localStorage
   ├─ Remove 'token'
   └─ Remove 'user'
   ↓
5. Clear cookies (POST /api/auth/logout)
   ↓
6. Redirect to login page
```

### Protected Route Access

```
1. User navigates to /admin or /sales route
   ↓
2. Middleware checks for token cookie
   ├─ If missing → Redirect to /login
   └─ If present → Allow request to proceed
   ↓
3. Page component verifies authentication
   └─ Uses useAuth() to check user state
   ↓
4. API calls include token in headers
   └─ Used for server-side user verification
```

### Session Validation

```
1. User makes API request to protected endpoint
   ↓
2. Extract token from request (cookie or header)
   ↓
3. Verify token using verifyToken()
   ├─ Check signature using JWT_SECRET
   ├─ Check expiration (7 days)
   └─ Return payload if valid
   ↓
4. Retrieve user from database using userId
   ↓
5. Proceed with request or return 401 Unauthorized
```

---

## API Endpoints

### POST `/api/auth/login`

Authenticates user and returns JWT token.

**Request**:
```json
{
  "username": "john_doe",
  "password": "secure_password_123"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "name": "John Doe",
    "role": "sales"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Missing username or password
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Server-side error during login

**Usage Example**:
```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'john_doe', password: 'password' }),
});
const data = await response.json();
if (response.ok) {
  localStorage.setItem('token', data.token);
}
```

### POST `/api/auth/logout`

Clears session and removes token cookie.

**Request**: No body required

**Success Response** (200):
```json
{
  "success": true
}
```

**Error Responses**:
- `500 Internal Server Error`: Server-side error during logout

**Usage Example**:
```typescript
await fetch('/api/auth/logout', { method: 'POST' });
localStorage.removeItem('token');
```

### GET `/api/auth/me`

Retrieves current authenticated user information.

**Request Headers**:
```
Authorization: Bearer <token>
// OR
Cookie: token=<token>
```

**Success Response** (200):
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "john_doe",
    "name": "John Doe",
    "role": "sales",
    "position": "Sales Senior",
    "teamId": "507f1f77bcf86cd799439012"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: No token or invalid token
- `404 Not Found`: User not found in database
- `500 Internal Server Error`: Server-side error

**Usage Example**:
```typescript
const response = await fetch('/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` },
});
if (response.ok) {
  const { user } = await response.json();
  console.log('Current user:', user);
}
```

### POST `/api/auth/register`

Currently disabled (returns 404 error).

**Response** (404):
```json
{
  "error": "Registration disabled"
}
```

**Note**: User registration is typically handled by administrators only.

---

## User Model

### Database Schema Details

```typescript
{
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: false,
    unique: false,
    lowercase: true,
    match: /.+\@.+\..+/
  },
  password: {
    type: String,
    required: true
    // Always hashed using bcrypt
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'sales'],
    default: 'sales'
  },
  phone: String,
  position: {
    type: String,
    default: ''
  },
  salary: {
    type: Number,
    default: 0
  },
  deviceId: {
    type: String,
    default: null
  },
  createdAt: Date,
  updatedAt: Date
}
```

### User Roles

#### Admin Role
- Full access to admin dashboard
- Can manage users, teams, and settings
- Can view attendance records
- Can modify commission rules
- Path: `/admin/*`

#### Sales Role
- Access to sales dashboard
- Can view and manage personal leads
- Can view personal attendance
- Can view personal commissions
- Can view team information
- Path: `/sales/*`

---

## Configuration

### Environment Variables

Required environment variables for authentication:

```env
# JWT Configuration
JWT_SECRET=ffef90659c5e28d13c5b7829f764fc4a

# NextAuth Configuration (for reference)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-change-in-production

# MongoDB Configuration
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/bode-crm
```

### Token Configuration

**Token Type**: JWT (JSON Web Token)

**Secret**: `process.env.JWT_SECRET`

**Algorithm**: HS256 (HMAC SHA-256)

**Expiration**: 7 days (`7d`)

**Payload Structure**:
```json
{
  "userId": "507f1f77bcf86cd799439011",
  "role": "sales",
  "type": "session",
  "iat": 1706402400,
  "exp": 1707007200
}
```

### Password Configuration

**Hashing Algorithm**: bcrypt

**Salt Rounds**: 10

**Cost Factor**: Balanced between security and performance

---

## Security Practices

### 1. Password Security

✅ **Implemented**:
- Passwords are hashed using bcrypt with 10 salt rounds
- Never stored in plain text
- Comparison done using bcrypt.compare() for timing-attack resistance
- Passwords are case-sensitive

❌ **Not Implemented** (Consider for future):
- Password strength validation
- Password complexity requirements
- Password expiration
- Password history tracking

### 2. Token Security

✅ **Implemented**:
- JWT tokens are signed with a secret key
- Tokens have 7-day expiration
- Token verification checks signature and expiration
- Tokens are stored in httpOnly cookies (for API requests)
- Tokens are stored in localStorage (for client-side access)

❌ **Not Implemented** (Consider for future):
- Token refresh mechanism
- Token blacklisting/revocation
- Multi-device session management
- Session timeout

### 3. Data Protection

✅ **Implemented**:
- Middleware protects admin and sales routes
- Token verification on sensitive API endpoints
- Username uniqueness enforced at database level
- Email validation for email field

❌ **Not Implemented** (Consider for future):
- HTTPS enforcement
- CSRF protection
- Rate limiting on login attempts
- Account lockout after failed attempts

### 4. Best Practices

✅ **Followed**:
- Credentials validated before database queries
- Secure password comparison using bcrypt
- Clear error messages without revealing user existence
- Token verification before accessing protected resources
- Environment variables for secrets

⚠️ **To Consider**:
- Implement rate limiting on auth endpoints
- Add CAPTCHA for login
- Log authentication attempts
- Send security notifications on login
- Implement two-factor authentication

---

## Usage Examples

### Example 1: Login Component

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(username, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Username"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### Example 2: Protected Route Component

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ProtectedPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Your role: {user.role}</p>
    </div>
  );
}
```

### Example 3: API Request with Token

```typescript
async function fetchUserData(token: string) {
  const response = await fetch('/api/user/profile', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    throw new Error('Failed to fetch user data');
  }

  return response.json();
}
```

### Example 4: Logout Handler

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <button onClick={handleLogout}>
      Logout
    </button>
  );
}
```

### Example 5: Role-Based Access

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';

export function AdminOnlyComponent() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Not authenticated</div>;
  if (user.role !== 'admin') {
    return <div>Access denied - Admin only</div>;
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      {/* Admin-only content */}
    </div>
  );
}
```

---

## Error Handling

### Common Authentication Errors

| Error | Status | Cause | Solution |
|-------|--------|-------|----------|
| Missing username or password | 400 | User didn't provide credentials | Require both fields in form |
| Invalid credentials | 401 | Wrong username or password | Show generic error message |
| User not found | 401 | Username doesn't exist | Check username spelling |
| Unauthorized | 401 | No token or invalid token | Redirect to login |
| User not found | 404 | User deleted from database | Logout and re-register |
| Login failed | 500 | Database or server error | Log error, retry later |
| Logout failed | 500 | Server-side error | Refresh page and retry |

### Error Response Examples

**Invalid Credentials**:
```json
{
  "error": "Invalid credentials",
  "status": 401
}
```

**Missing Fields**:
```json
{
  "error": "Missing username or password",
  "status": 400
}
```

**Server Error**:
```json
{
  "error": "Login failed",
  "status": 500
}
```

### Handling Errors in Code

```typescript
try {
  await login(username, password);
} catch (error) {
  if (error instanceof Error) {
    // Display user-friendly message
    if (error.message.includes('Invalid credentials')) {
      setError('Username or password is incorrect');
    } else if (error.message.includes('Missing')) {
      setError('Please fill in all fields');
    } else {
      setError('An error occurred. Please try again.');
    }
  }
}
```

---

## Troubleshooting

### Issue: "useAuth must be used within AuthProvider"

**Cause**: Hook is used in a component that's not wrapped by AuthProvider

**Solution**:
```typescript
// In your root layout or main component
import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout({ children }) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
```

### Issue: Token is not persisting after page reload

**Cause**: Token is not being saved to localStorage, or localStorage is disabled

**Solution**:
- Check if localStorage is enabled in browser
- Verify token is being stored in login function
- Check if localStorage is being cleared elsewhere
- Use browser DevTools → Application → Storage to verify

### Issue: Redirecting to login loop

**Cause**: Token is expired or invalid, middleware keeps redirecting

**Solution**:
1. Clear browser storage: `localStorage.clear()`
2. Clear cookies
3. Try logging in again
4. Check JWT_SECRET is consistent across app

### Issue: "Invalid credentials" even with correct password

**Cause**: 
- Password was not hashed when user was created
- Password hashing library issue
- Database connection problem

**Solution**:
1. Verify user password is hashed in database
2. Reset user password with proper hashing
3. Check MongoDB connection
4. View server logs for detailed errors

### Issue: Token verification failing on API routes

**Cause**:
- JWT_SECRET environment variable is different
- Token is corrupted or malformed
- Token has expired

**Solution**:
```typescript
// Check token in browser console
const token = localStorage.getItem('token');
console.log('Token:', token);

// Check JWT_SECRET matches
console.log('JWT_SECRET:', process.env.JWT_SECRET);

// Verify token manually (if using jwt.io)
// Copy token to jwt.io and check expiration
```

### Issue: Middleware not protecting routes

**Cause**: 
- Token cookie is not being set
- Middleware config is incorrect
- Cookie domain/path mismatch

**Solution**:
1. Check if token is in cookies: DevTools → Application → Cookies
2. Verify middleware config in `src/middleware.ts`
3. Check cookie settings in login endpoint
4. Test with manual cookie manipulation

### Issue: CORS errors with API endpoints

**Cause**: Cross-origin requests are blocked

**Solution**:
1. Ensure API routes use appropriate headers
2. Include credentials in fetch: `credentials: 'include'`
3. Check Next.js configuration
```typescript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  credentials: 'include', // Include cookies
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(credentials),
});
```

### Issue: localStorage not available (SSR)

**Cause**: Code is executing on server-side where localStorage doesn't exist

**Solution**:
```typescript
// Mark component as client-side
'use client';

import { useEffect, useState } from 'react';

export function MyComponent() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const token = localStorage.getItem('token');
  }, []);

  if (!isMounted) return null;
  // Use localStorage after mounting
}
```

---

## Summary

The Bode CRM authentication system provides:

- ✅ Secure JWT-based token authentication
- ✅ Bcrypt password hashing
- ✅ React Context for global auth state
- ✅ Middleware-based route protection
- ✅ Persistent session storage
- ✅ Role-based access control (Admin/Sales)
- ✅ Clear separation of concerns
- ✅ Comprehensive error handling

For questions or issues, refer to the troubleshooting section or contact the development team.

---

**Document Version**: 1.0  
**Last Updated**: January 28, 2026  
**Author**: Bode CRM Development Team
