# Screen 6: Meal Detail Screen

## Visual Description
Detailed meal view showing nutritional breakdown with individual food items and meal-level targets.

## Key Elements

### Header
- **Title**: "ארוחת בוקר - מוזלי" (Breakfast - Muesli) - centered
- **Action Icons** (right):
  - Refresh icon (circular arrow)
  - Document/list icon
  - Window/square icon

### Nutritional Summary Bar
Horizontal bar showing meal-level targets:
- **Calories**: 342/342kcal (blue underline - target met)
- **Protein**: 20/20g (green underline - target met)
- **Carbs**: 58.6/59g (red underline - almost met)
- **Fat**: 3.9/3g (magenta underline - slightly over)

### Food Items List
Table-like layout with columns:
- Quantity
- Food Name
- Calories
- Protein
- Carbs
- Fat

**Items**:
1. **מעדן פרו** (Pro Dessert/Yogurt)
   - Quantity: 1Qty
   - Calories: 140
   - Protein: 20g
   - Carbs: 6.8g
   - Fat: 3g

2. **תפוח עץ** (Apple)
   - Quantity: 1Qty
   - Calories: 100
   - Protein: 0g
   - Carbs: 26g
   - Fat: 0g

3. **ברנפלקס** (Branflakes)
   - Quantity: 30g
   - Calories: 102
   - Protein: 0g
   - Carbs: 26g
   - Fat: 0.9g

### Action Buttons
- **"+ Add Food"** (left, blue text link)
- **"Complete"** (right, blue button)

## Design Patterns
- Itemized food breakdown
- Per-item nutrition display
- Meal-level target summary
- Quick add functionality
- Completion action
- Color-coded macro underlines

## Implementation Notes
- Need dedicated meal detail route/page
- Table/list component for food items
- Meal-level target calculation
- Individual food item nutrition display
- Quick add food flow
- Meal completion endpoint

## Comparison with Current System
**Current (`MealMenuV2`)**:
- Shows meal slots in accordion
- Food options in tabs (Protein/Carb/Fat)
- Quantity input in dialog

**Inspiration Improvements**:
- Dedicated meal detail page
- Shows all foods in meal together
- Meal-level targets visible
- Individual food nutrition breakdown
- Quick add without leaving page
- Better visual hierarchy

