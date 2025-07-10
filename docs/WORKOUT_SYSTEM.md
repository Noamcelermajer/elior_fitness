# Elior Fitness Workout Management System

## Overview

The Elior Fitness Workout Management System provides a comprehensive solution for personal trainers to manage their exercise bank, create custom workout plans, and track client progress. The system is designed to be flexible and practical for real-world training scenarios.

## Key Features

### 🏋️ Exercise Bank Management
- **Trainer-owned exercise library**: Each trainer maintains their own categorized exercise bank
- **Muscle group categorization**: Exercises are organized by muscle groups (chest, back, shoulders, biceps, triceps, legs, core, cardio, full_body, other)
- **Detailed exercise information**: Name, description, video URL, equipment needed, and step-by-step instructions
- **Search and filtering**: Find exercises by muscle group, trainer, or search terms

### 📅 Workout Plan Creation
- **Custom workout plans**: Trainers create personalized plans for each client
- **Flexible structure**: No predefined templates - trainers build plans based on client needs
- **Session organization**: Plans can have multiple workout sessions (e.g., "Day 1: Upper Body", "Cardio Day")
- **Scheduling support**: Optional day-of-week assignment for recurring schedules

### 🎯 Exercise Assignment
- **Unlimited exercises**: No artificial limits on how many exercises per workout
- **Flexible parameters**: Sets, reps (as strings to support "8-12", "30 seconds", "to failure"), rest time, and notes
- **Order management**: Exercises are ordered within each session
- **Bulk operations**: Add multiple exercises to a session at once

### 📊 Progress Tracking
- **Exercise completion logging**: Clients log their actual performance
- **Flexible data capture**: Actual sets, reps, weight used, difficulty rating, and notes
- **Form photo uploads**: Optional photo uploads for form assessment
- **Bulk completion**: Log multiple exercise completions at once

### 📈 Analytics and Reporting
- **Workout summaries**: Completion rates, total sessions, and progress overview
- **Exercise progress**: Individual exercise performance tracking over time
- **Performance trends**: Average sets, reps, weights, and difficulty ratings
- **Progress visualization**: Historical data for client and trainer review

## Database Schema

### Core Models

#### Exercise
```sql
exercises (
    id INTEGER PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    video_url VARCHAR,
    muscle_group ENUM NOT NULL,
    equipment_needed VARCHAR,
    instructions TEXT,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### WorkoutPlan
```sql
workout_plans (
    id INTEGER PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    trainer_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    start_date DATETIME,
    end_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
)
```

#### WorkoutSession
```sql
workout_sessions (
    id INTEGER PRIMARY KEY,
    workout_plan_id INTEGER NOT NULL,
    name VARCHAR NOT NULL,
    day_of_week INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### WorkoutExercise
```sql
workout_exercises (
    id INTEGER PRIMARY KEY,
    workout_session_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    order INTEGER NOT NULL,
    sets INTEGER,
    reps VARCHAR,
    rest_time INTEGER,
    notes TEXT
)
```

#### ExerciseCompletion
```sql
exercise_completions (
    id INTEGER PRIMARY KEY,
    workout_exercise_id INTEGER NOT NULL,
    client_id INTEGER NOT NULL,
    actual_sets INTEGER,
    actual_reps VARCHAR,
    weight_used VARCHAR,
    difficulty_rating INTEGER,
    notes TEXT,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    form_photo_path VARCHAR
)
```

## API Endpoints

### Exercise Bank Management

#### Create Exercise
```http
POST /api/workouts/exercises
Authorization: Bearer {trainer_token}
Content-Type: application/json

{
    "name": "Push-ups",
    "description": "Classic bodyweight chest exercise",
    "muscle_group": "chest",
    "equipment_needed": "None",
    "instructions": "Start in plank position, lower body until chest nearly touches ground, push back up"
}
```

#### Get Exercises
```http
GET /api/workouts/exercises?trainer_id=1&muscle_group=chest&search=push&page=1&size=20
Authorization: Bearer {token}
```

#### Update Exercise
```http
PUT /api/workouts/exercises/{exercise_id}
Authorization: Bearer {trainer_token}
Content-Type: application/json

{
    "name": "Modified Push-ups",
    "instructions": "Updated instructions with better form cues"
}
```

#### Delete Exercise
```http
DELETE /api/workouts/exercises/{exercise_id}
Authorization: Bearer {trainer_token}
```

### Workout Plan Management

#### Create Workout Plan
```http
POST /api/workouts/plans
Authorization: Bearer {trainer_token}
Content-Type: application/json

{
    "name": "Beginner Strength Program",
    "description": "4-week program focusing on basic strength building",
    "client_id": 123,
    "start_date": "2024-01-01T00:00:00",
    "end_date": "2024-01-29T00:00:00"
}
```

#### Get Workout Plans
```http
GET /api/workouts/plans?trainer_id=1&client_id=123&search=strength&page=1&size=20
Authorization: Bearer {token}
```

#### Get Complete Workout Plan
```http
GET /api/workouts/plans/{plan_id}/complete
Authorization: Bearer {token}
```

### Workout Session Management

#### Create Workout Session
```http
POST /api/workouts/plans/{plan_id}/sessions
Authorization: Bearer {trainer_token}
Content-Type: application/json

{
    "name": "Day 1: Upper Body",
    "day_of_week": 0,
    "notes": "Focus on chest and back exercises"
}
```

#### Add Exercise to Session
```http
POST /api/workouts/sessions/{session_id}/exercises
Authorization: Bearer {trainer_token}
Content-Type: application/json

{
    "exercise_id": 1,
    "order": 1,
    "sets": 3,
    "reps": "8-12",
    "rest_time": 60,
    "notes": "Focus on form, go to failure if needed"
}
```

#### Bulk Add Exercises
```http
POST /api/workouts/sessions/{session_id}/exercises/bulk
Authorization: Bearer {trainer_token}
Content-Type: application/json

{
    "exercises": [
        {
            "exercise_id": 1,
            "order": 1,
            "sets": 3,
            "reps": "8-12",
            "rest_time": 60
        },
        {
            "exercise_id": 2,
            "order": 2,
            "sets": 3,
            "reps": "5-8",
            "rest_time": 90
        }
    ]
}
```

### Exercise Completion Tracking

#### Log Exercise Completion
```http
POST /api/workouts/completions
Authorization: Bearer {client_token}
Content-Type: multipart/form-data

{
    "workout_exercise_id": 1,
    "actual_sets": 3,
    "actual_reps": "10",
    "weight_used": "bodyweight",
    "difficulty_rating": 3,
    "notes": "Felt good, maintained proper form",
    "form_photo": [file]
}
```

#### Bulk Log Completions
```http
POST /api/workouts/completions/bulk
Authorization: Bearer {client_token}
Content-Type: application/json

{
    "completions": [
        {
            "workout_exercise_id": 1,
            "actual_sets": 3,
            "actual_reps": "10",
            "weight_used": "bodyweight",
            "difficulty_rating": 3
        },
        {
            "workout_exercise_id": 2,
            "actual_sets": 2,
            "actual_reps": "6",
            "weight_used": "bodyweight",
            "difficulty_rating": 4
        }
    ]
}
```

#### Get Exercise Completions
```http
GET /api/workouts/completions?client_id=123&start_date=2024-01-01&end_date=2024-01-31&page=1&size=20
Authorization: Bearer {token}
```

### Analytics and Reporting

#### Get Workout Summary
```http
GET /api/workouts/plans/{plan_id}/summary
Authorization: Bearer {token}
```

#### Get Exercise Progress
```http
GET /api/workouts/exercises/{exercise_id}/progress?client_id=123
Authorization: Bearer {token}
```

## Usage Examples

### Trainer Workflow

1. **Create Exercise Bank**
   ```python
   # Create exercises in your bank
   exercises = [
       {"name": "Push-ups", "muscle_group": "chest", "equipment_needed": "None"},
       {"name": "Pull-ups", "muscle_group": "back", "equipment_needed": "Pull-up bar"},
       {"name": "Squats", "muscle_group": "legs", "equipment_needed": "None"}
   ]
   ```

2. **Create Workout Plan**
   ```python
   # Create a plan for a client
   plan = {
       "name": "Beginner Strength Program",
       "client_id": client_id,
       "start_date": "2024-01-01",
       "end_date": "2024-01-29"
   }
   ```

3. **Add Workout Sessions**
   ```python
   # Create sessions for the plan
   sessions = [
       {"name": "Day 1: Upper Body", "day_of_week": 0},
       {"name": "Day 2: Lower Body", "day_of_week": 2},
       {"name": "Day 3: Full Body", "day_of_week": 4}
   ]
   ```

4. **Add Exercises to Sessions**
   ```python
   # Add exercises to each session
   exercises_to_add = [
       {"exercise_id": 1, "order": 1, "sets": 3, "reps": "8-12"},
       {"exercise_id": 2, "order": 2, "sets": 3, "reps": "5-8"},
       {"exercise_id": 3, "order": 3, "sets": 3, "reps": "12-15"}
   ]
   ```

### Client Workflow

1. **View Workout Plan**
   ```python
   # Get complete workout plan
   plan = get_complete_workout_plan(plan_id)
   ```

2. **Complete Exercises**
   ```python
   # Log exercise completion
   completion = {
       "workout_exercise_id": 1,
       "actual_sets": 3,
       "actual_reps": "10",
       "weight_used": "bodyweight",
       "difficulty_rating": 3,
       "notes": "Felt good"
   }
   ```

3. **Track Progress**
   ```python
   # Get progress for specific exercise
   progress = get_exercise_progress(exercise_id, client_id)
   ```

## Security and Permissions

### Trainer Permissions
- Create, read, update, delete their own exercises
- Create, read, update, delete workout plans for their clients
- View all completions for their clients
- Access analytics for their clients

### Client Permissions
- View workout plans assigned to them
- Log exercise completions
- View their own progress and analytics
- Upload form photos for assessment

### Data Validation
- Exercise ownership validation (trainers can only modify their own exercises)
- Workout plan access validation (clients can only see their assigned plans)
- Completion ownership validation (clients can only log their own completions)

## Performance Considerations

### Database Optimization
- Indexed foreign keys for fast joins
- Pagination support for large datasets
- Efficient filtering and search capabilities

### File Management
- Secure file uploads with validation
- Automatic thumbnail generation for form photos
- Organized file structure for easy management

### Caching Strategy
- Exercise bank caching for frequently accessed data
- Workout plan caching for active clients
- Progress data caching for analytics

## Integration Points

### WebSocket Notifications
- Real-time updates when exercises are completed
- Live progress tracking for trainers
- Instant notifications for plan updates

### File Management
- Form photo uploads with approval workflow
- Video URL support for exercise demonstrations
- Secure file storage and access control

### User Management
- Integration with existing user authentication
- Role-based access control (trainer vs client)
- User profile integration for personalized experiences

## Testing

Run the comprehensive test suite:

```bash
python test_workout_system.py
```

The test script covers:
- Exercise bank creation and management
- Workout plan creation and modification
- Exercise assignment and completion tracking
- Progress analytics and reporting
- Bulk operations
- Permission validation
- Error handling

## Future Enhancements

### Planned Features
- **Exercise variations**: Support for exercise modifications and progressions
- **Workout templates**: Pre-built templates for common training goals
- **Advanced analytics**: Machine learning insights for progress prediction
- **Mobile optimization**: Enhanced mobile experience for on-the-go tracking
- **Integration APIs**: Third-party fitness app integrations

### Scalability Improvements
- **Database sharding**: Support for large-scale deployments
- **Microservices architecture**: Modular service decomposition
- **Real-time collaboration**: Multi-trainer support for team environments
- **Advanced reporting**: Custom report generation and export

## Support and Documentation

For additional support:
- API Documentation: `/docs` (Swagger UI)
- Database Schema: See `app/models/workout.py`
- Service Layer: See `app/services/workout_service.py`
- API Endpoints: See `app/routers/workouts.py`

The workout system is designed to be flexible, scalable, and practical for real-world personal training scenarios, supporting the dynamic nature of fitness programming and client progress tracking. 