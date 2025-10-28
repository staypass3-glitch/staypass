# StayPass Route Structure Documentation

## Overview
This document outlines the complete navigation structure and routing flow for the StayPass application.

## Route Hierarchy

### 1. Authentication Routes (Unauthenticated Users)
```
Welcome
├── SignIn
├── SignUp
└── EnterOtp
```

### 2. Student Routes (Authenticated Students)
```
Student (StudentPortal)
└── studentTabsNavigator
    ├── Home (StudentDashboard)
    ├── History
    └── Account (Profile)
```

### 3. Admin Routes (Authenticated Admins)
```
Admin (AdminDashboard)
├── SessionDetails
│   └── StudentHistory
└── PendingApproval
```

### 4. Guard Routes (Authenticated Guards)
```
GuardScanner
```

## Detailed Navigation Flows

### Student Flow
1. **Welcome** → Landing page for all users
2. **SignIn/SignUp** → Authentication screens
3. **EnterOtp** → OTP verification
4. **Student** → QR scanner to join session
5. **studentTabsNavigator** → Main student interface
   - **Home** → Dashboard with leave requests
   - **History** → Request history
   - **Account** → Profile management

### Admin Flow
1. **Welcome** → Landing page
2. **SignIn/SignUp** → Authentication
3. **EnterOtp** → OTP verification
4. **Admin** → Main admin dashboard
   - **SessionDetails** → Individual session management
     - **StudentHistory** → Individual student request history
   - **PendingApproval** → Manage pending requests

### Guard Flow
1. **Welcome** → Landing page
2. **SignIn/SignUp** → Authentication
3. **EnterOtp** → OTP verification
4. **GuardScanner** → QR scanner for student check-in/out

## Route Parameters

### SessionDetails
- `session`: Session object with id, college_id, status, etc.

### StudentHistory
- `student`: Student object with id, name, email, etc.
- `sessionId`: Current session ID

### PendingApproval
- `sessionId`: Session ID for filtering requests

## Navigation Methods

### Student Navigation
```javascript
// Join session after QR scan
navigation.replace('studentTabsNavigator')

// Navigate between tabs
navigation.navigate('Home') // StudentDashboard
navigation.navigate('History')
navigation.navigate('Account') // Profile
```

### Admin Navigation
```javascript
// Navigate to session details
navigation.navigate('SessionDetails', { session: sessionData })

// Navigate to student history
navigation.navigate('StudentHistory', { 
  student: studentData, 
  sessionId: sessionId 
})

// Navigate to pending requests
navigation.navigate('PendingApproval', { sessionId: sessionId })
```

### Guard Navigation
```javascript
// Guard stays in GuardScanner screen
// No additional navigation needed
```

## Database Relationships

### Profiles Table
- `id`: Primary key
- `current_session_id`: Links to sessions table
- `college_id`: Links to colleges table

### Requests Table
- `student_id`: Links to profiles table (student)
- `admin_id`: Links to profiles table (admin)
- `session_id`: Links to sessions table
- `college_id`: Links to colleges table

### Sessions Table
- `admin_id`: Links to profiles table (admin)
- `college_id`: Links to colleges table

### QR Codes Table
- `session_id`: Links to sessions table
- `college_id`: Links to colleges table

## Error Handling

### Database Query Errors
- Use specific relationship names (e.g., `requests!requests_student_id_fkey`)
- Handle missing data gracefully
- Show appropriate error messages

### Navigation Errors
- Check for required parameters before navigation
- Handle missing route parameters
- Provide fallback navigation

## Security Considerations

### Route Protection
- All authenticated routes check user role
- Role-based navigation restrictions
- Session validation on each screen

### Data Access
- Users can only access their own data
- Admins can access session-specific data
- Guards can only scan QR codes

## Performance Optimizations

### Navigation
- Use `useMemo` for loading screens
- Lazy load components where possible
- Cache navigation state

### Database Queries
- Use specific relationship names
- Limit query results where appropriate
- Implement proper error handling

## Future Enhancements

### Potential New Routes
- **Settings**: App configuration
- **Notifications**: Push notification management
- **Reports**: Analytics and reporting
- **Help**: User support and documentation

### Navigation Improvements
- Deep linking support
- URL-based navigation
- Navigation state persistence
- Offline navigation support 