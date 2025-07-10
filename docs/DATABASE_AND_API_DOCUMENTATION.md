# Elior Fitness - Database & API Documentation

## Table of Contents
1. [Database Schema](#database-schema)
2. [User Roles & Permissions](#user-roles--permissions)
3. [API Endpoints](#api-endpoints)
4. [Frontend Integration Guidelines](#frontend-integration-guidelines)
5. [Authentication & Security](#authentication--security)
6. [Data Flow Examples](#data-flow-examples)

---

## Database Schema

### Core Tables

#### 1. Users Table
```sql
users (
    id INTEGER PRIMARY KEY,
    username VARCHAR UNIQUE NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    full_name VARCHAR,
    role ENUM('admin', 'trainer', 'client') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    trainer_id INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME
)
```

**Relationships:**
- `trainer_id` → `users.id` (self-referencing for trainer-client relationships)
- `clients` → One-to-many relationship with clients
- `progress_entries` → One-to-many relationship with progress tracking

#### 2. Trainer Profiles Table
```sql
trainer_profiles (
    id INTEGER PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
    specialization VARCHAR,
    bio VARCHAR,
    years_of_experience INTEGER,
    certification VARCHAR
)
```

#### 3. Client Profiles Table
```sql
client_profiles (
    id INTEGER PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
    trainer_id INTEGER NOT NULL REFERENCES users(id),
    height INTEGER, -- in cm
    target_weight INTEGER, -- in grams
    fitness_goals VARCHAR,
    medical_conditions VARCHAR,
    dietary_restrictions VARCHAR
)
```

### Workout System Tables

#### 4. Exercises Table
```sql
exercises (
    id INTEGER PRIMARY KEY,
    name VARCHAR NOT NULL,
    description VARCHAR,
    video_url VARCHAR,
    muscle_group ENUM('chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core', 'cardio', 'full_body', 'other') NOT NULL,
    equipment_needed VARCHAR,
    instructions VARCHAR,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT NOW()
)
```

#### 5. Workout Plans Table
```sql
workout_plans (
    id INTEGER PRIMARY KEY,
    name VARCHAR NOT NULL,
    description VARCHAR,
    trainer_id INTEGER NOT NULL REFERENCES users(id),
    client_id INTEGER NOT NULL REFERENCES users(id),
    start_date DATETIME,
    end_date DATETIME,
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME
)
```

#### 6. Workout Sessions Table
```sql
workout_sessions (
    id INTEGER PRIMARY KEY,
    workout_plan_id INTEGER NOT NULL REFERENCES workout_plans(id),
    name VARCHAR NOT NULL,
    day_of_week INTEGER, -- 0-6 for Monday-Sunday
    notes VARCHAR,
    created_at DATETIME DEFAULT NOW()
)
```

#### 7. Workout Exercises Table
```sql
workout_exercises (
    id INTEGER PRIMARY KEY,
    workout_session_id INTEGER NOT NULL REFERENCES workout_sessions(id),
    exercise_id INTEGER NOT NULL REFERENCES exercises(id),
    order INTEGER NOT NULL,
    sets INTEGER,
    reps VARCHAR,
    rest_time INTEGER, -- in seconds
    notes VARCHAR
)
```

#### 8. Exercise Completions Table
```sql
exercise_completions (
    id INTEGER PRIMARY KEY,
    workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id),
    client_id INTEGER NOT NULL REFERENCES users(id),
    completed_at DATETIME DEFAULT NOW(),
    actual_sets INTEGER,
    actual_reps VARCHAR,
    weight_used VARCHAR,
    difficulty_rating INTEGER, -- 1-5 scale
    notes VARCHAR,
    form_photo_path VARCHAR
)
```

### Nutrition System Tables

#### 9. Nutrition Plans Table (Legacy)
```sql
nutrition_plans (
    id INTEGER PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id),
    trainer_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR NOT NULL,
    description VARCHAR,
    daily_calories INTEGER,
    protein_target INTEGER,
    carbs_target INTEGER,
    fat_target INTEGER,
    start_date DATETIME,
    end_date DATETIME,
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME
)
```

#### 10. Recipes Table
```sql
recipes (
    id INTEGER PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(id),
    name VARCHAR NOT NULL,
    description VARCHAR,
    instructions VARCHAR,
    calories INTEGER,
    protein INTEGER,
    carbs INTEGER,
    fat INTEGER,
    preparation_time INTEGER, -- in minutes
    created_at DATETIME DEFAULT NOW()
)
```

#### 11. Planned Meals Table
```sql
planned_meals (
    id INTEGER PRIMARY KEY,
    nutrition_plan_id INTEGER NOT NULL REFERENCES nutrition_plans(id),
    recipe_id INTEGER REFERENCES recipes(id),
    meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout') NOT NULL,
    day_of_week INTEGER,
    time_of_day VARCHAR,
    notes VARCHAR
)
```

#### 12. Meal Completions Table
```sql
meal_completions (
    id INTEGER PRIMARY KEY,
    planned_meal_id INTEGER NOT NULL REFERENCES planned_meals(id),
    client_id INTEGER NOT NULL REFERENCES users(id),
    status ENUM('pending', 'completed', 'skipped') NOT NULL,
    photo_path VARCHAR,
    completed_at DATETIME DEFAULT NOW(),
    notes VARCHAR
)
```

### New Meal Plan System Tables

#### 13. Meal Plans Table (New)
```sql
meal_plans (
    id INTEGER PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id),
    trainer_id INTEGER NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    title VARCHAR,
    total_calories INTEGER,
    protein_target INTEGER,
    carb_target INTEGER,
    fat_target INTEGER,
    notes VARCHAR,
    created_at DATETIME DEFAULT NOW()
)
```

#### 14. Meal Entries Table
```sql
meal_entries (
    id INTEGER PRIMARY KEY,
    meal_plan_id INTEGER NOT NULL REFERENCES meal_plans(id),
    name VARCHAR NOT NULL,
    order_index INTEGER NOT NULL,
    notes VARCHAR
)
```

#### 15. Meal Components Table
```sql
meal_components (
    id INTEGER PRIMARY KEY,
    meal_entry_id INTEGER NOT NULL REFERENCES meal_entries(id),
    type ENUM('protein', 'carb', 'fat', 'vegetable', 'fruit', 'other') NOT NULL,
    description VARCHAR NOT NULL,
    calories INTEGER,
    protein INTEGER,
    carbs INTEGER,
    fat INTEGER,
    is_optional BOOLEAN DEFAULT FALSE
)
```

#### 16. Meal Uploads Table
```sql
meal_uploads (
    id INTEGER PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id),
    meal_entry_id INTEGER NOT NULL REFERENCES meal_entries(id),
    image_path VARCHAR,
    marked_ok BOOLEAN,
    uploaded_at DATETIME DEFAULT NOW()
)
```

### Progress Tracking Tables

#### 17. Progress Entries Table
```sql
progress_entries (
    id INTEGER PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    weight FLOAT NOT NULL, -- in kg
    photo_path VARCHAR,
    notes VARCHAR,
    created_at DATETIME DEFAULT NOW()
)
```

#### 18. Weigh Ins Table (Legacy)
```sql
weigh_ins (
    id INTEGER PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES users(id),
    weight FLOAT NOT NULL, -- in kg
    body_fat FLOAT, -- percentage
    notes VARCHAR,
    recorded_at DATETIME DEFAULT NOW()
)
```

---

## User Roles & Permissions

### Role Hierarchy
1. **Admin** - Full system access
2. **Trainer** - Can manage clients, create plans, view progress
3. **Client** - Can view own data, log completions, upload photos

### Permission Matrix

| Action | Admin | Trainer | Client |
|--------|-------|---------|--------|
| Create users | ✅ | ❌ | ❌ |
| Create trainers | ✅ | ❌ | ❌ |
| Create clients | ✅ | ✅ | ❌ |
| View all users | ✅ | Limited | ❌ |
| Create workout plans | ✅ | ✅ | ❌ |
| Create nutrition plans | ✅ | ✅ | ❌ |
| Create exercises | ✅ | ✅ | ❌ |
| Create recipes | ✅ | ✅ | ❌ |
| Log workout completions | ✅ | ✅ | ✅ |
| Log meal completions | ✅ | ✅ | ✅ |
| Upload progress photos | ✅ | ✅ | ✅ |
| View own progress | ✅ | ✅ | ✅ |
| View client progress | ✅ | ✅ | ❌ |

---

## API Endpoints

### Authentication (`/api/auth`)

#### Registration & Login
```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/token
GET /api/auth/me
```

**Frontend Usage:**
- Use `/register` for public client registration
- Use `/login` for JSON-based login
- Use `/token` for OAuth2 form-based login
- Use `/me` to get current user info

#### Role-Specific Registration
```http
POST /api/auth/register/admin    # Admin only
POST /api/auth/register/trainer  # Admin only
POST /api/auth/register/client   # Admin/Trainer only
POST /api/auth/setup/admin       # First admin setup
```

### User Management (`/api/users`)

```http
GET /api/users/                    # List users (filtered by role)
GET /api/users/{user_id}          # Get specific user
PUT /api/users/{user_id}          # Update user profile
DELETE /api/users/{user_id}       # Delete user (admin/trainer only)
POST /api/users/{trainer_id}/clients/{client_id}    # Assign client
DELETE /api/users/{trainer_id}/clients/{client_id}  # Remove assignment
```

**Frontend Guidelines:**
- Trainers see only their clients
- Clients see only their trainer
- Admins see all users
- Profile updates require authentication

### Workout Management (`/api/workouts`)

#### Exercise Bank
```http
POST /api/workouts/exercises      # Create exercise (trainer only)
GET /api/workouts/exercises       # List exercises (with filtering)
PUT /api/workouts/exercises/{id}  # Update exercise (trainer only)
DELETE /api/workouts/exercises/{id} # Delete exercise (trainer only)
```

#### Workout Plans
```http
POST /api/workouts/plans          # Create workout plan (trainer only)
GET /api/workouts/plans           # List workout plans
GET /api/workouts/plans/{id}      # Get specific plan
PUT /api/workouts/plans/{id}      # Update plan (trainer only)
DELETE /api/workouts/plans/{id}   # Delete plan (trainer only)
```

#### Workout Sessions
```http
POST /api/workouts/plans/{plan_id}/sessions    # Create session (trainer only)
GET /api/workouts/plans/{plan_id}/sessions     # List sessions
PUT /api/workouts/sessions/{id}                # Update session (trainer only)
DELETE /api/workouts/sessions/{id}             # Delete session (trainer only)
```

#### Exercise Completions
```http
POST /api/workouts/completions    # Log completion (client only)
GET /api/workouts/completions     # List completions
PUT /api/workouts/completions/{id} # Update completion
DELETE /api/workouts/completions/{id} # Delete completion
```

**Frontend Guidelines:**
- Trainers create and manage workout plans
- Clients can only log completions
- Exercise bank is shared among trainers
- Form photos are optional for completions

### Nutrition Management (`/api/nutrition`)

#### Nutrition Plans (Legacy)
```http
POST /api/nutrition/plans         # Create plan (trainer only)
GET /api/nutrition/plans          # List plans
GET /api/nutrition/plans/{id}     # Get specific plan
PUT /api/nutrition/plans/{id}     # Update plan (trainer only)
DELETE /api/nutrition/plans/{id}  # Delete plan (trainer only)
```

#### Recipes
```http
POST /api/nutrition/recipes       # Create recipe (trainer only)
GET /api/nutrition/recipes        # List recipes (with filtering)
GET /api/nutrition/recipes/{id}   # Get specific recipe
PUT /api/nutrition/recipes/{id}   # Update recipe (trainer only)
DELETE /api/nutrition/recipes/{id} # Delete recipe (trainer only)
```

#### Planned Meals
```http
POST /api/nutrition/planned-meals # Create planned meal (trainer only)
GET /api/nutrition/planned-meals/{id} # Get planned meal
PUT /api/nutrition/planned-meals/{id} # Update planned meal (trainer only)
DELETE /api/nutrition/planned-meals/{id} # Delete planned meal (trainer only)
```

#### Meal Completions
```http
POST /api/nutrition/meal-completions    # Log completion (client only)
GET /api/nutrition/meal-completions/{id} # Get completion
PUT /api/nutrition/meal-completions/{id} # Update completion
DELETE /api/nutrition/meal-completions/{id} # Delete completion
```

#### Weigh-ins
```http
POST /api/nutrition/weigh-ins     # Log weigh-in (client only)
GET /api/nutrition/weigh-ins      # List weigh-ins
GET /api/nutrition/weigh-ins/latest # Get latest weigh-in
PUT /api/nutrition/weigh-ins/{id} # Update weigh-in
DELETE /api/nutrition/weigh-ins/{id} # Delete weigh-in
```

#### Nutrition Goals
```http
POST /api/nutrition/goals         # Set goals (client only)
GET /api/nutrition/goals          # Get goals
PUT /api/nutrition/goals          # Update goals
```

#### Analytics
```http
GET /api/nutrition/daily-summary  # Daily nutrition summary
GET /api/nutrition/weekly-summary # Weekly nutrition summary
```

### Meal Plans (New System) (`/api/meal-plans`)

```http
POST /api/meal-plans/             # Create meal plan (trainer only)
GET /api/meal-plans/              # List meal plans
GET /api/meal-plans/{id}          # Get specific meal plan
PUT /api/meal-plans/{id}          # Update meal plan (trainer only)
DELETE /api/meal-plans/{id}       # Delete meal plan (trainer only)

POST /api/meal-plans/{id}/entries # Create meal entry (trainer only)
GET /api/meal-plans/{id}/entries  # List meal entries
PUT /api/meal-plans/entries/{id}  # Update meal entry (trainer only)
DELETE /api/meal-plans/entries/{id} # Delete meal entry (trainer only)

GET /api/meal-plans/summary/{client_id}/{date} # Get meal plan summary
```

**Frontend Guidelines:**
- New system supports component-based meal planning
- Trainers create meal plans with specific components
- Clients upload photos for approval
- Real-time notifications for meal uploads

### Progress Tracking (`/api/progress`)

```http
POST /api/progress/weight         # Add weight entry (client only)
GET /api/progress/weight          # Get weight history
GET /api/progress/weight/current  # Get current weight
DELETE /api/progress/weight/{id}  # Delete weight entry
```

**Frontend Guidelines:**
- Simple weight tracking with optional photos
- Weight history for charts and trends
- Only clients can log their own weight

### File Management (`/api/files`)

```http
POST /api/files/upload            # Upload file (any authenticated user)
GET /api/files/media/{category}/{filename} # Serve file
DELETE /api/files/{filename}      # Delete file (owner only)
```

**Frontend Guidelines:**
- Supports profile photos, progress photos, meal photos
- Automatic image processing and thumbnails
- Secure file serving with authentication

### WebSocket (`/api/ws`)

```http
GET /api/ws/notifications         # Real-time notifications
```

**Frontend Guidelines:**
- Real-time updates for meal uploads
- Trainer notifications for client activities
- Connection requires authentication token

---

## Frontend Integration Guidelines

### Authentication Flow

1. **Registration:**
   ```typescript
   // Public client registration
   const response = await fetch('/api/auth/register', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       username: 'client123',
       email: 'client@example.com',
       password: 'password123',
       full_name: 'John Doe',
       role: 'client'
     })
   });
   ```

2. **Login:**
   ```typescript
   // JSON-based login
   const response = await fetch('/api/auth/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       username: 'client123',
       password: 'password123'
     })
   });
   
   const { access_token } = await response.json();
   localStorage.setItem('token', access_token);
   ```

3. **Authenticated Requests:**
   ```typescript
   const response = await fetch('/api/users/me', {
     headers: {
       'Authorization': `Bearer ${localStorage.getItem('token')}`
     }
   });
   ```

### Role-Based UI Components

#### Admin Dashboard
- User management (create trainers, view all users)
- System analytics and reports
- Global settings and configurations

#### Trainer Dashboard
- Client management (assign/unassign clients)
- Create and manage workout plans
- Create and manage nutrition plans
- View client progress and completions
- Recipe management
- Real-time notifications for client activities

#### Client Dashboard
- View assigned workout plans
- View assigned nutrition plans
- Log workout completions
- Log meal completions
- Upload progress photos
- Track weight and progress
- View personal analytics

### Data Flow Examples

#### Creating a Workout Plan (Trainer)
```typescript
// 1. Create workout plan
const planResponse = await fetch('/api/workouts/plans', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Beginner Strength',
    description: '3-day strength training program',
    client_id: 123,
    start_date: '2024-01-01',
    end_date: '2024-01-31'
  })
});

// 2. Create workout sessions
const sessionResponse = await fetch(`/api/workouts/plans/${planId}/sessions`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Day 1: Upper Body',
    day_of_week: 1,
    notes: 'Focus on form and controlled movements'
  })
});
```

#### Logging Workout Completion (Client)
```typescript
const completionResponse = await fetch('/api/workouts/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    workout_exercise_id: 456,
    actual_sets: 3,
    actual_reps: '10, 8, 6',
    weight_used: '50kg',
    difficulty_rating: 4,
    notes: 'Felt strong today, increased weight'
  })
});
```

#### Uploading Progress Photo (Client)
```typescript
const formData = new FormData();
formData.append('file', photoFile);
formData.append('category', 'progress_photo');

const uploadResponse = await fetch('/api/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

// Then add to progress entry
const progressResponse = await fetch('/api/progress/weight', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: new FormData({
    weight: 75.5,
    notes: 'Weekly progress photo',
    photo: photoFile
  })
});
```

### Error Handling

```typescript
try {
  const response = await fetch('/api/workouts/plans', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(planData)
  });

  if (!response.ok) {
    const error = await response.json();
    
    switch (response.status) {
      case 401:
        // Redirect to login
        window.location.href = '/login';
        break;
      case 403:
        // Show permission error
        showError('You do not have permission to perform this action');
        break;
      case 422:
        // Show validation errors
        showValidationErrors(error.detail);
        break;
      default:
        showError('An unexpected error occurred');
    }
  }
} catch (error) {
  console.error('Network error:', error);
  showError('Network error. Please check your connection.');
}
```

### Real-time Updates

```typescript
// WebSocket connection for real-time notifications
const ws = new WebSocket(`ws://localhost:8000/api/ws/notifications?token=${token}`);

ws.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  
  switch (notification.type) {
    case 'meal_upload':
      // Show notification to trainer
      showNotification(`Client ${notification.client_name} uploaded a meal photo`);
      break;
    case 'workout_completion':
      // Update workout progress
      updateWorkoutProgress(notification.data);
      break;
  }
};
```

---

## Authentication & Security

### JWT Token Structure
```json
{
  "sub": "user_id",
  "role": "trainer",
  "exp": 1640995200,
  "iat": 1640908800
}
```

### Security Headers
- All API requests require `Authorization: Bearer <token>`
- CORS is configured for frontend domains
- File uploads are validated for type and size
- SQL injection protection via SQLAlchemy ORM

### Password Security
- Passwords are hashed using bcrypt
- Minimum 8 characters required
- Password change requires current password verification

---

## Data Flow Examples

### Complete Workout Flow
1. **Trainer creates workout plan** → `/api/workouts/plans`
2. **Trainer adds sessions** → `/api/workouts/plans/{id}/sessions`
3. **Trainer adds exercises** → `/api/workouts/sessions/{id}/exercises`
4. **Client views plan** → `/api/workouts/plans/{id}`
5. **Client logs completion** → `/api/workouts/completions`
6. **Trainer views progress** → `/api/workouts/completions?client_id={id}`

### Complete Nutrition Flow
1. **Trainer creates meal plan** → `/api/meal-plans/`
2. **Trainer adds meal entries** → `/api/meal-plans/{id}/entries`
3. **Client views meal plan** → `/api/meal-plans/{id}`
4. **Client uploads meal photo** → `/api/files/upload`
5. **Trainer approves/rejects** → Update meal upload status
6. **Real-time notification** → WebSocket notification

### Progress Tracking Flow
1. **Client logs weight** → `/api/progress/weight`
2. **Client uploads progress photo** → `/api/files/upload`
3. **System stores entry** → Database with photo path
4. **Client views history** → `/api/progress/weight`
5. **Trainer views client progress** → `/api/progress/weight?client_id={id}`

---

This documentation provides a comprehensive guide for frontend developers to integrate with the Elior Fitness API. All endpoints follow RESTful conventions and include proper authentication and authorization checks. 