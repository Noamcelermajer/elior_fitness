# 🍽️ Advanced Meal Plan System

## 📋 Overview

The Advanced Meal Plan System is a comprehensive nutrition management solution that allows trainers to create detailed meal plans for their clients with specific macronutrient targets, meal components, and photo-based meal tracking.

## 🎯 Key Features

### ✅ Core Functionality
- **Daily Meal Plans** - Create meal plans for specific dates
- **Meal Entries** - Individual meals (Breakfast, Lunch, Dinner, Snacks, Pre/Post Workout)
- **Meal Components** - Specific food items categorized by type (Protein, Carbs, Fats, Vegetables)
- **Macronutrient Tracking** - Protein, carbs, fats, and calorie targets
- **Photo Uploads** - Clients can upload meal photos for approval
- **Approval System** - Trainers can approve/reject meal photos
- **Progress Analytics** - Track completion rates and nutritional adherence

### 🏗️ Database Schema

#### `meal_plans` Table
```sql
CREATE TABLE meal_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    trainer_id INTEGER NOT NULL,
    date DATE NOT NULL,
    title TEXT,                          -- e.g., "Cutting Phase", "Mass Gain Week 1"
    total_calories INTEGER,
    protein_target INTEGER,              -- grams
    carb_target INTEGER,                 -- grams
    fat_target INTEGER,                  -- grams
    notes TEXT,                          -- daily guidance from trainer
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id),
    FOREIGN KEY (trainer_id) REFERENCES users(id)
);
```

#### `meal_entries` Table
```sql
CREATE TABLE meal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_plan_id INTEGER NOT NULL,
    name TEXT NOT NULL,                 -- e.g., "Breakfast", "Lunch", "Post-Workout"
    order_index INTEGER NOT NULL,       -- 0 = first meal
    notes TEXT,                         -- e.g., "2 protein options, avoid sauces"
    FOREIGN KEY (meal_plan_id) REFERENCES meal_plans(id)
);
```

#### `meal_components` Table
```sql
CREATE TABLE meal_components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_entry_id INTEGER NOT NULL,
    type TEXT NOT NULL,                -- 'protein', 'carb', 'fat', 'vegetable', etc.
    description TEXT NOT NULL,         -- e.g., "1 slice bread", "150g chicken breast"
    calories INTEGER,
    protein INTEGER,
    carbs INTEGER,
    fat INTEGER,
    is_optional BOOLEAN DEFAULT 0,
    FOREIGN KEY (meal_entry_id) REFERENCES meal_entries(id)
);
```

#### `meal_uploads` Table
```sql
CREATE TABLE meal_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    meal_entry_id INTEGER NOT NULL,
    image_path TEXT,
    marked_ok BOOLEAN,                 -- ✅ or ❌
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id),
    FOREIGN KEY (meal_entry_id) REFERENCES meal_entries(id)
);
```

## 🔌 API Endpoints

### Meal Plans Management

#### Create Meal Plan
```http
POST /api/meal-plans/
Content-Type: application/json
Authorization: Bearer <trainer_token>

{
  "client_id": 1,
  "date": "2025-01-15",
  "title": "Cutting Phase - Week 1",
  "total_calories": 1800,
  "protein_target": 150,
  "carb_target": 150,
  "fat_target": 60,
  "notes": "Focus on lean proteins and complex carbs. Avoid added sugars.",
  "meal_entries": [
    {
      "name": "Breakfast",
      "order_index": 0,
      "notes": "Eat within 1 hour of waking up",
      "meal_components": [
        {
          "type": "protein",
          "description": "3 egg whites + 1 whole egg",
          "calories": 120,
          "protein": 20,
          "carbs": 0,
          "fat": 5,
          "is_optional": false
        }
      ]
    }
  ]
}
```

#### Get Meal Plans
```http
GET /api/meal-plans/?client_id=1&start_date=2025-01-01&end_date=2025-01-31
Authorization: Bearer <token>
```

#### Get Specific Meal Plan
```http
GET /api/meal-plans/1
Authorization: Bearer <token>
```

#### Get Complete Meal Plan (with uploads)
```http
GET /api/meal-plans/1/complete
Authorization: Bearer <token>
```

#### Update Meal Plan
```http
PUT /api/meal-plans/1
Content-Type: application/json
Authorization: Bearer <trainer_token>

{
  "title": "Updated Cutting Phase",
  "total_calories": 1900,
  "notes": "Updated guidance for better results"
}
```

#### Delete Meal Plan
```http
DELETE /api/meal-plans/1
Authorization: Bearer <trainer_token>
```

### Meal Entries Management

#### Add Meal Entry to Plan
```http
POST /api/meal-plans/1/entries
Content-Type: application/json
Authorization: Bearer <trainer_token>

{
  "name": "Snack",
  "order_index": 2,
  "notes": "Pre-workout snack",
  "meal_components": [
    {
      "type": "protein",
      "description": "1 scoop protein powder",
      "calories": 120,
      "protein": 24,
      "carbs": 3,
      "fat": 1,
      "is_optional": false
    }
  ]
}
```

#### Get Meal Entry
```http
GET /api/meal-plans/entries/1
Authorization: Bearer <token>
```

#### Update Meal Entry
```http
PUT /api/meal-plans/entries/1
Content-Type: application/json
Authorization: Bearer <trainer_token>

{
  "name": "Updated Snack",
  "notes": "Updated pre-workout guidance"
}
```

#### Delete Meal Entry
```http
DELETE /api/meal-plans/entries/1
Authorization: Bearer <trainer_token>
```

### Meal Components Management

#### Add Component to Entry
```http
POST /api/meal-plans/entries/1/components
Content-Type: application/json
Authorization: Bearer <trainer_token>

{
  "type": "carb",
  "description": "1 banana",
  "calories": 105,
  "protein": 1,
  "carbs": 27,
  "fat": 0,
  "is_optional": true
}
```

#### Get Meal Component
```http
GET /api/meal-plans/components/1
Authorization: Bearer <token>
```

#### Update Meal Component
```http
PUT /api/meal-plans/components/1
Content-Type: application/json
Authorization: Bearer <trainer_token>

{
  "description": "1 large banana",
  "calories": 120
}
```

#### Delete Meal Component
```http
DELETE /api/meal-plans/components/1
Authorization: Bearer <trainer_token>
```

### Meal Photo Uploads

#### Upload Meal Photo
```http
POST /api/meal-plans/uploads/1/photo
Content-Type: multipart/form-data
Authorization: Bearer <client_token>

Form Data:
- image: [file]
- marked_ok: true
```

#### Create Meal Upload (without photo)
```http
POST /api/meal-plans/uploads
Content-Type: application/json
Authorization: Bearer <client_token>

{
  "meal_entry_id": 1,
  "marked_ok": true
}
```

#### Get Meal Upload
```http
GET /api/meal-plans/uploads/1
Authorization: Bearer <token>
```

#### Update Meal Upload (approve/reject)
```http
PUT /api/meal-plans/uploads/1
Content-Type: application/json
Authorization: Bearer <trainer_token>

{
  "marked_ok": true
}
```

#### Delete Meal Upload
```http
DELETE /api/meal-plans/uploads/1
Authorization: Bearer <token>
```

### Analytics & Summaries

#### Get Meal Plan Summary
```http
GET /api/meal-plans/summary/1/2025-01-15
Authorization: Bearer <token>
```

Response:
```json
{
  "date": "2025-01-15",
  "total_meals": 4,
  "completed_meals": 3,
  "total_calories": 1650,
  "total_protein": 145,
  "total_carbs": 180,
  "total_fat": 55,
  "completion_rate": 75.0
}
```

#### Get Today's Summary (Client)
```http
GET /api/meal-plans/summary/today
Authorization: Bearer <client_token>
```

## 🎯 Usage Examples

### Trainer Workflow

1. **Create Client Account**
   ```http
   POST /api/auth/register/client
   {
     "username": "john_client",
     "email": "john@example.com",
     "password": "password123",
     "full_name": "John Client",
     "role": "client"
   }
   ```

2. **Assign Client**
   ```http
   POST /api/users/clients/1/assign
   Authorization: Bearer <trainer_token>
   ```

3. **Create Meal Plan**
   ```http
   POST /api/meal-plans/
   Authorization: Bearer <trainer_token>
   {
     "client_id": 1,
     "date": "2025-01-15",
     "title": "Cutting Phase - Day 1",
     "total_calories": 1800,
     "protein_target": 150,
     "carb_target": 150,
     "fat_target": 60,
     "notes": "Focus on lean proteins and complex carbs",
     "meal_entries": [
       {
         "name": "Breakfast",
         "order_index": 0,
         "notes": "Eat within 1 hour of waking",
         "meal_components": [
           {
             "type": "protein",
             "description": "3 egg whites + 1 whole egg",
             "calories": 120,
             "protein": 20,
             "carbs": 0,
             "fat": 5,
             "is_optional": false
           },
           {
             "type": "carb",
             "description": "1/2 cup oatmeal",
             "calories": 150,
             "protein": 5,
             "carbs": 27,
             "fat": 3,
             "is_optional": false
           }
         ]
       }
     ]
   }
   ```

### Client Workflow

1. **Login**
   ```http
   POST /api/auth/token
   Content-Type: application/x-www-form-urlencoded
   
   username=john_client&password=password123
   ```

2. **View Today's Meal Plan**
   ```http
   GET /api/meal-plans/?client_id=1&start_date=2025-01-15&end_date=2025-01-15
   Authorization: Bearer <client_token>
   ```

3. **Upload Meal Photo**
   ```http
   POST /api/meal-plans/uploads/1/photo
   Content-Type: multipart/form-data
   Authorization: Bearer <client_token>
   
   Form Data:
   - image: [photo_file]
   - marked_ok: true
   ```

4. **Check Today's Progress**
   ```http
   GET /api/meal-plans/summary/today
   Authorization: Bearer <client_token>
   ```

## 🔒 Security & Permissions

### Role-Based Access Control

- **Trainers** can:
  - Create, read, update, delete meal plans
  - Create, read, update, delete meal entries and components
  - View all client meal uploads
  - Approve/reject meal photos
  - View analytics for all their clients

- **Clients** can:
  - View their own meal plans
  - Upload meal photos
  - Mark meals as completed
  - View their own progress summaries

- **Admins** can:
  - Access all functionality
  - Manage all users and meal plans

### File Upload Security

- **Image validation** using `python-magic`
- **File size limits** (10MB for meal photos)
- **Secure file naming** with UUIDs
- **Access control** on file serving
- **Automatic thumbnail generation**

## 📊 Data Flow Example

### Trainer Creates Meal Plan
1. Trainer creates meal plan with entries and components
2. System stores in `meal_plans`, `meal_entries`, `meal_components` tables
3. Client receives notification via WebSocket

### Client Completes Meal
1. Client uploads photo for specific meal entry
2. System stores in `meal_uploads` table
3. Photo is processed and thumbnails generated
4. Trainer receives notification via WebSocket
5. Trainer can approve/reject the meal

### Analytics Generation
1. System calculates completion rates from `meal_uploads`
2. System calculates nutritional totals from `meal_components`
3. Summary data is returned for progress tracking

## 🚀 Integration Points

### WebSocket Notifications
- **Meal plan created** - Notify client
- **Meal photo uploaded** - Notify trainer
- **Meal approved/rejected** - Notify client
- **Daily summary available** - Notify both

### File Management
- **Photo uploads** integrated with FileService
- **Thumbnail generation** for faster loading
- **Access control** on media endpoints

### Authentication
- **JWT tokens** required for all endpoints
- **Role-based permissions** enforced
- **Client-trainer relationships** validated

## 🧪 Testing

Run the test script to verify the system:
```bash
python test_meal_plans.py
```

Or test manually via the API documentation:
```bash
# Start the application
docker-compose up

# Visit the API docs
open http://localhost:8000/docs
```

## 📈 Future Enhancements

- **Recipe integration** - Link meal components to recipe database
- **Nutritional database** - Auto-calculate macros from food database
- **Meal templates** - Reusable meal structures
- **Advanced analytics** - Trend analysis and recommendations
- **Mobile app integration** - Real-time meal tracking
- **AI meal suggestions** - Smart meal recommendations

## 🎉 Success!

The Advanced Meal Plan System is now fully implemented and ready for production use. Trainers can create detailed meal plans, clients can track their meals with photos, and the system provides comprehensive analytics for progress monitoring. 