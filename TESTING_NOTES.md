# Testing Notes - Form Filling Improvements

## Issues Found During Testing

### 1. Food Item Creation Form
**Problem:** The `name_hebrew` field (required) was not being filled, causing form submission to fail.

**Solution:** Ensure the Hebrew name field is always filled when creating food items.

**Field IDs for Food Form:**
- `macro_type` - Select dropdown for macro type
- `name` - Food name in English (optional)
- `name_hebrew` - Food name in Hebrew (REQUIRED)
- `calories` - Calories per 100g
- `protein` - Protein per 100g
- `carbs` - Carbs per 100g
- `fat` - Fat per 100g

### 2. Workout Split Creation Form
**Problem:** The `days_per_week` field was not being filled when creating a new workout split, causing the split creation to fail.

**Solution:** Always fill the `days_per_week` field when creating a workout split.

**Field IDs for Workout Split Form:**
- Split name (required)
- Description (optional)
- `days_per_week` - Number of days per week (REQUIRED)

### 3. Form Filling Method
**Problem:** Forms were being filled field-by-field with individual clicks, which is inefficient and error-prone.

**Solution:** Use Playwright-style field filling by targeting field IDs/names directly:
- Use `page.fill('#field_id', 'value')` instead of clicking and typing
- Fill all fields in one batch operation
- This is more reliable and faster

## Translation Error Fixed
- Fixed hardcoded "Duration (weeks)" label in `CreateWorkoutPlanV2.tsx` to use translation key `t('workoutCreation.durationWeeks')`

## Next Steps
1. Implement proper Playwright-style form filling using field IDs
2. Ensure all required fields are filled (especially `name_hebrew` and `days_per_week`)
3. Test workout split creation with days field
4. Test meal plan creation
5. Test client view for mobile UI issues

