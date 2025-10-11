# Meal Plan System Changes

## Overview
Updated the meal plan system to match trainer workflow requirements.

## Key Changes

### 1. Meal Numbering System
- **OLD**: Meals categorized as Breakfast, Lunch, Dinner, Snack, Pre-workout, Post-workout
- **NEW**: Meals numbered sequentially: Meal 1, Meal 2, Meal 3, etc.
- Trainer can create any number of meals (e.g., 6 meals per day if needed)
- Each meal has a `name` field (customizable) and `order_index` for ordering

### 2. Food Categories Simplified
- **OLD**: 6 categories (protein, carb, fat, vegetable, fruit, other)
- **NEW**: 3 categories only:
  - **CARBS**: Rice, bread, pasta, puffs, banana, fruits, etc.
  - **PROTEIN**: Chicken, fish, eggs, protein powder, yogurt (like Danone), etc.
  - **FAT**: Peanut butter, oils, nuts, avocado, etc.

### 3. Meal Structure Example

```
Meal 1 (Breakfast - trainer can name it anything):
  Carbs:
    - 2 rice puffs
    - 1 banana
  Protein:
    - 1 protein yogurt Danone
  Fat:
    - 1 scoop peanut butter

Meal 2 (Mid-morning):
  Carbs:
    - 100g oatmeal
    - 1 apple
  Protein:
    - 30g protein powder
  Fat:
    - 10g almonds
```

## Database Schema

### MealEntry Table
- `id`: Primary key
- `meal_plan_id`: Foreign key to MealPlan
- `name`: Free text (e.g., "Meal 1", "Breakfast", "Post-Workout")
- `order_index`: Integer for ordering (0, 1, 2, ...)
- `notes`: Optional notes from trainer

### MealComponent Table
- `id`: Primary key
- `meal_entry_id`: Foreign key to MealEntry
- `type`: Enum (CARBS, PROTEIN, FAT)
- `description`: Food item and quantity (e.g., "2 rice puffs", "1 banana")
- `calories`: Optional
- `protein`: Grams
- `carbs`: Grams
- `fat`: Grams
- `is_optional`: Boolean

## API Usage Example

### Create a Meal Plan with Multiple Meals

```json
{
  "client_id": 123,
  "date": "2025-01-11",
  "title": "Bulking Phase - Week 1",
  "total_calories": 3000,
  "protein_target": 200,
  "carb_target": 350,
  "fat_target": 80,
  "notes": "High carb day, drink lots of water",
  "meal_entries": [
    {
      "name": "Meal 1",
      "order_index": 0,
      "notes": "Within 1 hour of waking",
      "meal_components": [
        {
          "type": "carbs",
          "description": "2 rice puffs",
          "carbs": 40
        },
        {
          "type": "carbs",
          "description": "1 banana",
          "carbs": 25
        },
        {
          "type": "protein",
          "description": "1 protein yogurt Danone",
          "protein": 20
        },
        {
          "type": "fat",
          "description": "1 scoop peanut butter",
          "fat": 15
        }
      ]
    },
    {
      "name": "Meal 2",
      "order_index": 1,
      "notes": "Mid-morning snack",
      "meal_components": [
        {
          "type": "carbs",
          "description": "1 apple",
          "carbs": 20
        },
        {
          "type": "protein",
          "description": "30g protein powder",
          "protein": 25
        },
        {
          "type": "fat",
          "description": "10g almonds",
          "fat": 6
        }
      ]
    },
    {
      "name": "Meal 3",
      "order_index": 2,
      "notes": "Lunch - can be restaurant meal",
      "meal_components": [
        {
          "type": "carbs",
          "description": "200g white rice",
          "carbs": 80
        },
        {
          "type": "protein",
          "description": "200g chicken breast",
          "protein": 50
        },
        {
          "type": "fat",
          "description": "1 tbsp olive oil",
          "fat": 14
        }
      ]
    }
  ]
}
```

## Frontend Display

### Meal Card Example
```
┌─────────────────────────────────┐
│ Meal 1                          │
│ Within 1 hour of waking         │
├─────────────────────────────────┤
│ 🌾 CARBS:                       │
│   • 2 rice puffs                │
│   • 1 banana                    │
│                                 │
│ 💪 PROTEIN:                     │
│   • 1 protein yogurt Danone     │
│                                 │
│ 🥑 FAT:                         │
│   • 1 scoop peanut butter       │
└─────────────────────────────────┘
```

## Benefits

1. **Flexibility**: Trainer can create 1-10+ meals per day as needed
2. **Simplicity**: Only 3 food categories to manage
3. **Clear Structure**: Each meal has defined categories
4. **Customizable**: Meal names can be anything (numbers, times, descriptive names)
5. **Scalable**: Easy to add more meals or modify existing ones

## Migration Notes

### Backward Compatibility
- Old `MealType` enum is kept for legacy `PlannedMeal` model
- New system uses `ComponentType` with 3 categories
- Both systems can coexist during migration

### Frontend Updates Needed
1. Update meal creation form to use 3 categories only
2. Change meal display to show numbered meals
3. Update meal entry form to allow flexible naming
4. Add UI for reordering meals (drag-and-drop based on `order_index`)

## Testing

### Test Cases
1. Create meal plan with 6 meals
2. Add multiple food items to each category
3. Reorder meals
4. Update meal names
5. Add/remove components
6. Client uploads meal photos
7. Trainer reviews and marks meals as OK or not

---

**Date**: 2025-01-11
**Status**: ✅ Backend Updated, Frontend Pending
**Branch**: local-development-fixes

