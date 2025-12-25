# Screen 5: Nutrition/Meal Tracking Dashboard

## Visual Description
Dark-themed nutrition dashboard showing daily macro progress with concentric ring chart and meal list.

## Key Elements

### Header
- **Date Navigation**: "< Today >" (centered)
- **Program Name**: "מיני קאט" (Mini Cut) on right

### Macro Summary Section
**Left Side - Numerical Display**:
- **Kcal**: 1864.3 / 1864 (blue text) - slightly over
- **Protein**: 169.6 / 170g (green text) - almost complete
- **Carbs**: 143.7 / 144g (red text) - almost complete
- **Fat**: 40.2 / 39g (magenta text) - slightly over

**Right Side - Visual Rings**:
- Four concentric rings representing:
  - Outer ring (light blue): Calories
  - Second ring (green): Protein
  - Third ring (red): Carbs
  - Inner ring (magenta): Fat
- All rings appear almost fully filled

### Meal List
Each meal shows:
- ✓ Green checkmark (left) - indicates completion
- Meal name in Hebrew:
  1. "ארוחת בוקר - מוזלי" (Breakfast - Muesli)
  2. "ארוחת צהריים - בשר/עוף/דג" (Lunch - Meat/Chicken/Fish)
  3. "ארוחת ביניים - to go" (Snack - to go)
  4. "ארוחת ערב - כריך" (Dinner - Sandwich)
  5. "קלוריות חופשיות" (Free Calories)
- ✏️ Blue pencil icon (right) - for editing

### Pagination Indicator
- Blue dot
- Grey rectangle (carousel indicator)

## Design Patterns
- Concentric ring chart for visual macro progress
- Color-coded macros (consistent throughout app)
- Meal completion indicators
- Quick edit access
- Date navigation
- Program name display

## Implementation Notes
- Need ring chart component (SVG or Canvas)
- Color scheme: Blue (kcal), Green (protein), Red (carbs), Magenta (fat)
- Meal completion tracking
- "Free Calories" is interesting - allows flexible calorie allocation
- Date picker for viewing different days

## Comparison with Current System
**Current (`MealMenuV2`)**:
- Shows macro circles (separate)
- Shows meal slots in accordion
- Has daily macro summary

**Inspiration Improvements**:
- Concentric rings (more compact, visual)
- Better meal list (checkmarks, quick edit)
- Date navigation
- Program name display
- "Free Calories" concept

