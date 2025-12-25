# Client Calories Counting & Meal System - Summary

## ✅ Current Status

The meal system is **fully functional** and properly indexed. All components are connected and working correctly.

## 📍 Key Locations

### Backend
- **Models**: `app/models/meal_system.py`
- **API Router**: `app/routers/meal_system.py` 
- **API Base Path**: `/api/v2/meals`
- **Schemas**: `app/schemas/meal_system.py`
- **Registration**: `app/main.py` (line 700)

### Frontend
- **Main Page**: `Frontend/src/pages/MealsPage.tsx`
- **Main Component**: `Frontend/src/components/MealMenuV2.tsx`
- **History Component**: `Frontend/src/components/MealHistory.tsx`
- **Route**: `/meals` (defined in `Frontend/src/App.tsx`)

## 🔄 Recent Improvements

1. **Data Refresh Logic** ✅
   - Fixed: Now refreshes both choices and daily macros after all food operations
   - Ensures UI stays in sync with backend data
   - Applied to: `submitFoodChoice()`, `submitCustomFood()`, `deleteFoodChoice()`

## 🎯 Core Functionality

### Calorie Counting Flow
1. Client views meal plan → `MealMenuV2` loads active plan
2. Client selects food → Enters quantity → Creates `ClientMealChoice`
3. System calculates calories → `GET /api/v2/meals/daily-macros`
4. Real-time updates → Frontend displays consumed vs targets
5. Meal completion → Auto or manual tracking
6. Daily history → Save to `DailyMealHistory`

### Key Calculations
- **Meal Plan Foods**: Nutrition values per 100g, scaled by quantity consumed
- **Custom Foods**: Direct calorie/macro values
- **Daily Totals**: Sum of all choices for the day
- **Progress**: Consumed vs targets with percentages

## 📊 API Endpoints Summary

### Most Important for Calorie Counting:
- `GET /api/v2/meals/daily-macros` - **Main calorie calculation endpoint**
- `GET /api/v2/meals/choices` - Get today's food choices
- `POST /api/v2/meals/choices` - Record food selection
- `PUT /api/v2/meals/choices/{id}` - Update food choice
- `DELETE /api/v2/meals/choices/{id}` - Delete food choice
- `GET /api/v2/meals/plans` - Get active meal plan
- `GET /api/v2/meals/history` - Get meal history

## 🔍 System Architecture

```
Trainer → Creates Meal Plan
  ↓
MealPlanV2 (daily targets)
  ↓
MealSlot (individual meals)
  ↓
MacroCategory (Protein/Carb/Fat)
  ↓
FoodOption (specific foods, nutrition per 100g)
  ↓
ClientMealChoice (client selection + quantity)
  ↓
Daily Calculation (GET /daily-macros)
  ↓
Display Progress (consumed vs targets)
```

## ✨ Features

1. **Real-time Calorie Tracking** - Updates as client adds foods
2. **Macro Tracking** - Protein, Carbs, Fat with visual progress
3. **Custom Foods** - Clients can add foods not in meal plan
4. **Meal Completion** - Auto or manual meal completion tracking
5. **Meal History** - View past days with detailed breakdown
6. **Progress Visualization** - Circular progress indicators for macros
7. **Quantity Input** - Flexible gram-based quantity entry
8. **Over/Under Alerts** - Visual warnings when exceeding targets

## 🎨 UI Components

- **MealMenuV2**: Main interface with meal slots, food selection, progress
- **MacroCircle**: Circular progress indicators
- **MealHistory**: Historical data display
- **Dialogs**: Food quantity input, custom food entry

## 🔐 Permissions

- **Clients**: Can only view/modify their own meal data
- **Trainers**: Can view/modify their clients' meal plans and data
- **Admins**: Full access to all data

## 📝 Notes

- All nutrition values in `FoodOption` are stored **per 100g**
- Quantity parsing handles: "150g", "150", "150.5g", etc.
- Dates normalized to UTC start of day for consistency
- Only one active meal plan per client
- Auto-completion uses 0.5 tolerance (may need adjustment)

## 🚀 Ready for Changes

The system is properly indexed and ready for modifications. All components are:
- ✅ Properly connected
- ✅ Well-documented
- ✅ Following consistent patterns
- ✅ Error-handled
- ✅ Type-safe (TypeScript)

## 📚 Documentation

See `MEAL_SYSTEM_INDEX.md` for complete technical documentation.

