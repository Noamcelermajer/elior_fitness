# Mobile App Inspiration - Screens Analysis

## Overview
This folder contains analysis and planning documents for mobile app screens that serve as inspiration for the Elior Fitness app redesign.

## Screen Descriptions

### 1. Dashboard/Home Screen
**File**: `screen-01-dashboard.md`

**Key Features**:
- Personalized greeting with user name (Hebrew: "אליאור קרמיזי")
- Daily check-in section with streak tracking (11 DAY STREAK)
- Progress cards:
  - Weight tracking with graph
  - Water tracker (0L | 3L target)
  - Steps counter
- Notification bell with badge (1 unread)
- Messages icon
- Bottom navigation: Home, Workout, Nutrition, Calendar, More

**Design Elements**:
- Dark theme
- Blue accents for interactive elements
- Card-based layout
- Progress indicators
- Streak visualization with flame emoji

---

### 2. Daily Check-In Form
**File**: `screen-02-daily-checkin.md`

**Key Features**:
- Date selection (pre-filled: 25 Dec, 2025)
- Input fields:
  - Steps counter
  - Weight input
- Yes/No questions:
  - "Did you walk 10000 steps yesterday?"
  - "10 minutes in the sun"
- Rating scales (1-10):
  - "How hungry were you yesterday" (selected: 7)
  - "How many hours did you sleep last night" (selected: 7)
- Action buttons:
  - "Submit" (primary blue)
  - "Remind me in 2 hours" (secondary)

**Design Elements**:
- Clean form layout
- Interactive rating scales
- Binary choice buttons (✓, X, ↻)

---

### 3. Workout Plan View
**File**: `screen-03-workout-plan.md`

**Key Features**:
- Workout type tabs (Pull/Push - "do twice a week")
- Warm Up section with video thumbnails
- Workout section with exercises:
  - Exercise name (Hebrew)
  - Video thumbnails with play icons
  - Sets, Reps, Rest time
  - Exercise descriptions
  - Superset indicators
- Exercise letter indicators (A, B, C1, etc.)
- "Log this workout" button
- Bottom navigation

**Design Elements**:
- Video integration
- Exercise categorization
- Expandable descriptions
- Superset tagging

---

### 4. Workout Logging Screen
**File**: `screen-04-workout-logging.md`

**Key Features**:
- Timer display (00:16 00)
- Warm Up section with completion checkmarks
- Workout section with exercise details
- Set tracking:
  - Weight input (e.g., "60 kg", "55 kg")
  - Reps input (e.g., "10 Reps")
  - Completion checkmarks per set
- "Add set" button
- Notes section with placeholder text
- Next exercise preview

**Design Elements**:
- Real-time set tracking
- Completion indicators
- Sequential exercise flow
- Notes integration

---

### 5. Nutrition/Meal Tracking Dashboard
**File**: `screen-05-nutrition-dashboard.md`

**Key Features**:
- Date navigation ("< Today >")
- Program name: "מיני קאט" (Mini Cut)
- Daily macro summary:
  - Kcal: 1864.3 / 1864 (blue)
  - Protein: 169.6 / 170g (green)
  - Carbs: 143.7 / 144g (red)
  - Fat: 40.2 / 39g (magenta)
- Concentric ring chart visualization
- Meal list with checkmarks:
  1. Breakfast - Muesli
  2. Lunch - Meat/Chicken/Fish
  3. Snack - to go
  4. Dinner - Sandwich
  5. Free Calories
- Edit icons (pencil) for each meal

**Design Elements**:
- Visual macro progress (rings)
- Color-coded macros
- Meal completion indicators
- Quick meal access

---

### 6. Meal Detail Screen
**File**: `screen-06-meal-detail.md`

**Key Features**:
- Meal title: "Breakfast - Muesli" (Hebrew)
- Action icons: refresh, list, window
- Nutritional summary bar:
  - Calories: 342/342kcal
  - Protein: 20/20g
  - Carbs: 58.6/59g
  - Fat: 3.9/3g
- Food items list with:
  - Quantity (1Qty, 30g)
  - Food name (Hebrew)
  - Calories, Protein, Carbs, Fat per item
- Actions:
  - "+ Add Food" link
  - "Complete" button

**Design Elements**:
- Itemized food breakdown
- Per-item nutrition display
- Meal-level targets
- Quick add functionality

---

### 7. Calendar View
**File**: `screen-07-calendar.md`

**Key Features**:
- Month view with workout indicators
- Hebrew workout labels:
  - "פוש" (Push)
  - "פול" (Pull)
- Selected day highlighting
- Selected day details:
  - Date and day name
  - Logged workout with timestamp
  - Workout type description
- View toggle: Month/List
- "Request Event" button
- Filter icon
- Bottom navigation

**Design Elements**:
- Calendar grid layout
- Color-coded workout types
- Day selection
- Event logging

---

## Common Design Patterns

### Navigation
- Bottom navigation bar (5 items)
- Top header with back arrows
- Tab-based navigation for related content

### Visual Design
- Dark theme throughout
- Blue for primary actions
- Color-coded macros (blue, green, red, magenta)
- Card-based layouts
- Progress indicators (rings, bars, checkmarks)

### User Experience
- Quick actions (checkmarks, buttons)
- Visual feedback (completion states)
- Streak tracking
- Real-time updates
- Hebrew language support

---

## Key Features to Consider

1. **Daily Check-In System**
   - Weight tracking
   - Steps tracking
   - Wellness questions
   - Sleep tracking
   - Hunger levels

2. **Progress Visualization**
   - Weight graphs
   - Water intake progress
   - Macro rings
   - Streak indicators

3. **Workout Integration**
   - Plan viewing
   - Exercise videos
   - Set/rep logging
   - Timer
   - Notes

4. **Nutrition Enhancement**
   - Meal-level targets
   - Food item breakdown
   - Quick add food
   - Visual macro progress
   - Meal completion tracking

5. **Calendar Integration**
   - Workout logging
   - Event requests
   - Day selection
   - Activity indicators

