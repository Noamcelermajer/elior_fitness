# Client Calories Counting & Meal System - Complete Index

## 📋 Overview

The meal system allows trainers to create meal plans for clients, and clients to track their daily food intake, calories, and macros (protein, carbs, fat).

**Base API Path**: `/api/v2/meals`

---

## 🗄️ Backend Structure

### Models (`app/models/meal_system.py`)

#### Core Models:
1. **MealPlanV2** (`meal_plans_v2`)
   - Main meal plan assigned to a client by trainer
   - Fields: `id`, `client_id`, `trainer_id`, `name`, `description`, `number_of_meals`, `total_calories`, `protein_target`, `carb_target`, `fat_target`, `is_active`, `start_date`, `end_date`
   - Relationships: `meal_slots`

2. **MealSlot** (`meal_slots_v2`)
   - Individual meal slot (e.g., Breakfast, Lunch, Meal 1)
   - Fields: `id`, `meal_plan_id`, `name`, `order_index`, `time_suggestion`, `notes`, `target_calories`, `target_protein`, `target_carbs`, `target_fat`
   - Relationships: `meal_plan`, `macro_categories`

3. **MacroCategory** (`macro_categories_v2`)
   - One of 3 macro categories: PROTEIN, CARB, FAT
   - Fields: `id`, `meal_slot_id`, `macro_type`, `quantity_instruction`, `notes`
   - Relationships: `meal_slot`, `food_options`

4. **FoodOption** (`food_options_v2`)
   - Specific food option within a macro category
   - Fields: `id`, `macro_category_id`, `name`, `name_hebrew`, `calories`, `protein`, `carbs`, `fat`, `serving_size`, `notes`, `order_index`
   - **Nutrition values are stored per 100g**
   - Relationships: `macro_category`, `client_choices`

5. **ClientMealChoice** (`client_meal_choices_v2`)
   - Client's selection from food options + custom foods
   - Fields: `id`, `client_id`, `food_option_id`, `meal_slot_id`, `date`, `quantity`, `photo_path`, `is_approved`, `trainer_comment`
   - Custom food fields: `custom_food_name`, `custom_calories`, `custom_protein`, `custom_carbs`, `custom_fat`
   - Relationships: `food_option`

6. **MealCompletionStatus** (`meal_completion_status_v2`)
   - Track per-meal completion status for each client/day
   - Fields: `id`, `client_id`, `meal_slot_id`, `date`, `is_completed`, `completion_method`, `completed_at`
   - Unique constraint: `(client_id, meal_slot_id, date)`

7. **DailyMealHistory** (`daily_meal_history_v2`)
   - Daily aggregated meal history for tracking progress
   - Fields: `id`, `client_id`, `date`, `total_calories`, `total_protein`, `total_carbs`, `total_fat`, `is_complete`

8. **MealBank** (`meal_bank`)
   - Reusable meal bank items that trainers can add to meal plans
   - Fields: `id`, `name`, `name_hebrew`, `macro_type`, `calories`, `protein`, `carbs`, `fat`, `created_by`, `is_public`

---

### API Endpoints (`app/routers/meal_system.py`)

#### Meal Plans
- `POST /api/v2/meals/plans` - Create meal plan (Trainer only)
- `POST /api/v2/meals/plans/complete` - Create complete meal plan with all meals (Trainer only)
- `GET /api/v2/meals/plans` - Get meal plans (filtered by role)
- `GET /api/v2/meals/plans/{plan_id}` - Get specific meal plan
- `PUT /api/v2/meals/plans/{plan_id}` - Update meal plan (Trainer only)
- `DELETE /api/v2/meals/plans/{plan_id}` - Delete meal plan (Trainer only)

#### Meal Slots
- `POST /api/v2/meals/plans/{plan_id}/slots` - Add meal slot (Trainer only)

#### Food Options
- `POST /api/v2/meals/macro-categories/{macro_id}/foods` - Add food option (Trainer only)
- `PUT /api/v2/meals/foods/{food_id}` - Update food option (Trainer only)
- `DELETE /api/v2/meals/foods/{food_id}` - Delete food option (Trainer only)

#### Client Meal Choices (Calorie Tracking)
- `POST /api/v2/meals/choices` - Record meal choice (Client only)
  - Supports both meal plan foods and custom foods
- `GET /api/v2/meals/choices` - Get meal choices
  - Clients see their own, trainers see their clients
  - Supports `client_id` and `date` filters
- `PUT /api/v2/meals/choices/{choice_id}` - Update meal choice
- `DELETE /api/v2/meals/choices/{choice_id}` - Delete meal choice

#### Daily Macros & Calories
- `GET /api/v2/meals/daily-macros` - Calculate daily macro consumption
  - Returns: `consumed`, `targets`, `remaining`, `percentages`
  - Supports `client_id` and `date` parameters
  - **Key endpoint for calorie counting**

#### Meal History
- `POST /api/v2/meals/history` - Save/update daily meal history
- `GET /api/v2/meals/history` - Get meal history with detailed meal breakdown
- `GET /api/v2/meals/history/average` - Calculate average calories over period

#### Meal Completion
- `GET /api/v2/meals/completions` - Get meal completion statuses for a date
- `POST /api/v2/meals/completions` - Create/update meal completion status

#### Meal Bank
- `POST /api/v2/meals/meal-bank` - Create meal bank item (Trainer only)
- `GET /api/v2/meals/meal-bank` - Get meal bank items
- `GET /api/v2/meals/meal-bank/{item_id}` - Get specific meal bank item
- `PUT /api/v2/meals/meal-bank/{item_id}` - Update meal bank item (Trainer only)
- `DELETE /api/v2/meals/meal-bank/{item_id}` - Delete meal bank item (Trainer only)
- `GET /api/v2/meals/meal-bank/export/excel` - Export meal bank to Excel
- `POST /api/v2/meals/meal-bank/import/excel` - Import meal bank from Excel

---

## 🎨 Frontend Structure

### Pages

#### `Frontend/src/pages/MealsPage.tsx`
- Main entry point for client meal tracking
- Wraps `MealMenuV2` component
- Redirects non-clients away

### Components

#### `Frontend/src/components/MealMenuV2.tsx` (Main Component)
**Purpose**: Client-facing meal tracking interface with calorie counting

**Key Features**:
- Displays active meal plan with meal slots
- Real-time calorie and macro tracking
- Food selection from meal plan options
- Custom food entry
- Daily macro progress visualization
- Meal completion tracking
- Meal history integration

**Key Functions**:
- `fetchMealPlan()` - Loads active meal plan
- `fetchChoices()` - Loads today's meal choices
- `fetchDailyMacros()` - Calculates daily calories/macros
- `fetchMealCompletions()` - Gets meal completion status
- `submitFoodChoice()` - Records food selection with quantity
- `submitCustomFood()` - Records custom food entry
- `deleteFoodChoice()` - Removes a food choice
- `upsertMealCompletion()` - Updates meal completion status
- `getMealTotals()` - Calculates totals for a meal slot
- `finishDay()` - Saves daily meal history

**State Management**:
- `mealPlan` - Current active meal plan
- `choices` - Today's meal choices
- `dailyMacros` - Daily macro calculations
- `mealCompletions` - Meal completion statuses
- `selectedFood` - Currently selected food for quantity input
- `customFood` - Custom food form data

**UI Sections**:
1. Header with meal plan name
2. Daily Macro Progress Card (MacroCircle components)
3. Calories Summary with progress bar
4. Custom Foods Section
5. Meal Slots (Accordion) with:
   - Meal totals vs targets
   - Macro category tabs (Protein/Carb/Fat)
   - Food options with selection
   - Quantity input dialog
6. Meal History Panel (toggleable)

#### `Frontend/src/components/MealHistory.tsx`
**Purpose**: Display historical meal data and averages

**Features**:
- Shows meal history entries with detailed breakdown
- Displays average calories over period
- Shows daily meal completions
- Visual progress indicators

**API Calls**:
- `GET /api/v2/meals/history` - Get meal history
- `GET /api/v2/meals/history/average` - Get average calories

#### `Frontend/src/components/MealMenu.tsx` (Legacy)
- Old meal menu component (may be deprecated)
- Uses hardcoded data

#### `Frontend/src/components/MacroCircle.tsx`
- Visual macro progress indicator
- Circular progress display

---

## 🔄 Data Flow

### Calorie Counting Flow:

1. **Trainer Creates Meal Plan**
   - Creates `MealPlanV2` with daily targets
   - Adds `MealSlot`s (meals)
   - Adds `MacroCategory`s (Protein/Carb/Fat) to each slot
   - Adds `FoodOption`s to each category

2. **Client Views Meal Plan**
   - `MealMenuV2` fetches active meal plan
   - Displays meal slots with food options

3. **Client Selects Food**
   - Client clicks food option
   - Enters quantity (grams)
   - Creates `ClientMealChoice` record
   - Quantity is stored as string (e.g., "150g")

4. **Calorie Calculation**
   - `GET /api/v2/meals/daily-macros` calculates totals:
     - For meal plan foods: scales nutrition values based on quantity
     - For custom foods: uses stored custom values
   - Returns consumed vs targets

5. **Meal Completion**
   - Auto-completes when targets are met
   - Manual completion via checkbox
   - Stored in `MealCompletionStatus`

6. **Daily History**
   - Client can "Finish Day" to save to `DailyMealHistory`
   - History includes detailed meal breakdown

---

## 📊 Key Calculations

### Calorie Calculation Logic (Backend: `get_daily_macros`)

```python
# For meal plan foods:
grams_consumed = parse_quantity(choice.quantity)  # e.g., "150g" -> 150
base_grams = 100  # Nutrition values are per 100g
scale = grams_consumed / base_grams  # e.g., 150/100 = 1.5

calories = food_option.calories * scale
protein = food_option.protein * scale
carbs = food_option.carbs * scale
fat = food_option.fat * scale

# For custom foods:
# Use stored custom_calories, custom_protein, etc. directly
```

### Frontend Calculation (`getMealTotals`)

```typescript
// Similar logic in frontend for real-time updates
const gramsConsumed = parseGrams(choice.quantity);
const baseServing = serving > 0 ? serving : 100;
const scale = gramsConsumed > 0 && baseServing > 0 ? gramsConsumed / baseServing : 1;

calories += (option.calories ?? 0) * scale;
protein += (option.protein ?? 0) * scale;
// etc.
```

---

## 🔍 Important Notes

1. **Nutrition Values**: All food option nutrition values are stored **per 100g**
2. **Quantity Parsing**: Backend uses regex to extract numbers from quantity strings (e.g., "150g" -> 150)
3. **Custom Foods**: Clients can add custom foods with manual calorie/macro entry
4. **Meal Completion**: Can be auto (when targets met) or manual (checkbox)
5. **Date Handling**: Dates are normalized to start of day (UTC) for consistency
6. **Permissions**: 
   - Clients can only see/modify their own data
   - Trainers can see/modify their clients' data
   - Admins can see all data

---

## 🐛 Known Issues / Areas to Check

1. **Quantity Parsing**: ✅ Handles various formats (150g, 150, 150.5g, etc.) via regex
2. **Date Timezone**: ✅ Dates are normalized to UTC start of day - frontend sends date strings that backend handles correctly
3. **Auto-completion**: Auto-completion logic uses tolerance of 0.5 - may need adjustment based on user feedback
4. **Custom Food Validation**: ✅ Custom foods require calories at minimum (enforced in frontend)
5. **Meal Plan Active Status**: ✅ Only one active meal plan per client - properly handled in backend
6. **Data Refresh**: ✅ Fixed - Now refreshes choices and macros after all food operations for consistency

---

## 📁 File Locations Summary

### Backend
- Models: `app/models/meal_system.py`
- Router: `app/routers/meal_system.py`
- Schemas: `app/schemas/meal_system.py` (referenced but not read)
- Main Router Registration: `app/main.py` (line 700)

### Frontend
- Main Page: `Frontend/src/pages/MealsPage.tsx`
- Main Component: `Frontend/src/components/MealMenuV2.tsx`
- History Component: `Frontend/src/components/MealHistory.tsx`
- Macro Circle: `Frontend/src/components/MacroCircle.tsx`
- Legacy Component: `Frontend/src/components/MealMenu.tsx`
- API Config: `Frontend/src/config/api.ts`

---

## 🚀 Next Steps for Improvements

1. Add date picker to view different days
2. Add photo upload for meal choices
3. Add trainer approval workflow
4. Add meal plan templates
5. Improve quantity input UX
6. Add barcode scanning for food entry
7. Add meal reminders/notifications
8. Add weekly/monthly progress charts

