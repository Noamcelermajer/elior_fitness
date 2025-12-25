# Elior Fitness App - Planning Document

## Inspiration Analysis

Based on the mobile app screens provided, here are the key features and design patterns we should consider implementing.

---

## 🎯 Core Features to Implement

### 1. Enhanced Dashboard/Home Screen
**Current State**: Basic client dashboard
**Inspiration**: Comprehensive home with check-ins, progress cards, streaks

**Proposed Features**:
- [ ] Personalized greeting with client name
- [ ] Daily check-in prompt with streak counter
- [ ] Progress cards:
  - [ ] Weight tracking with mini graph
  - [ ] Water intake tracker
  - [ ] Steps counter (if available)
  - [ ] Daily calorie progress
- [ ] Quick access to meals, workouts, progress
- [ ] Notification center integration
- [ ] Streak visualization

**Technical Considerations**:
- New endpoint: `GET /api/check-ins` for daily check-ins
- New model: `DailyCheckIn` for tracking daily metrics
- Frontend: New `Dashboard` component or enhance `Index.tsx`

---

### 2. Daily Check-In System
**Current State**: Not implemented
**Inspiration**: Comprehensive daily check-in form

**Proposed Features**:
- [ ] Date selection (default: today)
- [ ] Weight input (morning weight)
- [ ] Steps counter
- [ ] Wellness questions:
  - [ ] "Did you walk 10000 steps yesterday?" (Yes/No)
  - [ ] "10 minutes in the sun" (Yes/No)
  - [ ] Hunger level (1-10 scale)
  - [ ] Sleep hours (1-10 scale)
- [ ] Reminder system ("Remind me in 2 hours")
- [ ] Streak calculation

**Technical Considerations**:
- New model: `DailyCheckIn` with fields:
  - `client_id`, `date`, `weight`, `steps`, `walked_10000_steps`, `sun_exposure`, `hunger_level`, `sleep_hours`
- New endpoints:
  - `POST /api/check-ins` - Submit check-in
  - `GET /api/check-ins` - Get check-in history
  - `GET /api/check-ins/streak` - Get current streak
- Frontend: New `DailyCheckIn` component

---

### 3. Enhanced Nutrition Dashboard
**Current State**: `MealMenuV2` with basic macro display
**Inspiration**: Visual macro rings, meal list, quick access

**Proposed Enhancements**:
- [ ] Concentric ring chart for macros (like inspiration)
- [ ] Date navigation ("< Today >")
- [ ] Program name display (meal plan name)
- [ ] Enhanced meal list:
  - [ ] Meal completion checkmarks
  - [ ] Quick edit (pencil icon)
  - [ ] Meal-level targets display
  - [ ] "Free Calories" section
- [ ] Better visual hierarchy
- [ ] Color-coded macros (blue, green, red, magenta)

**Technical Considerations**:
- Enhance `MealMenuV2.tsx` with ring chart component
- Add date picker for viewing different days
- Improve meal list UI
- Add meal-level target display

---

### 4. Meal Detail Screen
**Current State**: Basic meal slot accordion
**Inspiration**: Dedicated meal detail page with food breakdown

**Proposed Features**:
- [ ] Dedicated meal detail page/route
- [ ] Meal title and program name
- [ ] Nutritional summary bar (meal-level targets)
- [ ] Food items list:
  - [ ] Quantity per item
  - [ ] Food name
  - [ ] Individual nutrition (calories, protein, carbs, fat)
- [ ] "+ Add Food" quick action
- [ ] "Complete" meal button
- [ ] Edit food items inline

**Technical Considerations**:
- New route: `/meals/:mealSlotId` or `/meals/:date/:mealId`
- New component: `MealDetail.tsx`
- Enhance food item display
- Add meal completion endpoint

---

### 5. Calendar Integration
**Current State**: Not implemented
**Inspiration**: Calendar view with workout/nutrition logging

**Proposed Features**:
- [ ] Calendar view (Month/List toggle)
- [ ] Workout indicators on calendar
- [ ] Meal completion indicators
- [ ] Day selection
- [ ] Selected day details:
  - [ ] Logged workouts
  - [ ] Meal completion status
  - [ ] Check-in status
- [ ] "Request Event" (trainer-client communication)
- [ ] Filter options

**Technical Considerations**:
- New route: `/calendar`
- New component: `CalendarView.tsx`
- New endpoint: `GET /api/calendar/events` - Get all events for month
- Integrate with existing workout and meal systems

---

### 6. Enhanced Workout Integration
**Current State**: Basic workout system exists
**Inspiration**: Rich workout logging with videos, sets, timer

**Proposed Enhancements**:
- [ ] Workout timer
- [ ] Set/rep logging during workout
- [ ] Exercise video integration
- [ ] Notes section per workout
- [ ] "Add set" functionality
- [ ] Completion checkmarks
- [ ] Next exercise preview

**Technical Considerations**:
- Enhance existing workout system
- Add timer component
- Video integration (if available)
- Real-time set logging

---

## 🎨 Design System

### Color Scheme
- **Primary**: Blue (#3B82F6 or similar)
- **Success/Protein**: Green
- **Carbs**: Red/Orange
- **Fat**: Magenta/Purple
- **Background**: Dark theme
- **Text**: White/Light gray

### Components Needed
1. **Ring Chart** - For macro visualization
2. **Progress Cards** - For weight, water, steps
3. **Rating Scale** - For 1-10 inputs
4. **Calendar Grid** - For calendar view
5. **Streak Indicator** - For check-in streaks
6. **Timer Component** - For workout logging

---

## 📱 Mobile-First Considerations

### Layout
- Bottom navigation (5 items)
- Card-based layouts
- Swipeable sections
- Pull-to-refresh
- Responsive grid systems

### Interactions
- Quick actions (checkmarks, buttons)
- Visual feedback (completion states)
- Smooth transitions
- Loading states

---

## 🔄 Integration Points

### Existing Systems to Enhance
1. **Meal System** (`MealMenuV2`)
   - Add ring chart
   - Improve meal list
   - Add meal detail page
   - Date navigation

2. **Workout System**
   - Add timer
   - Enhance logging
   - Add notes
   - Video integration

3. **Progress System**
   - Add weight graph
   - Add water tracking
   - Add steps tracking

### New Systems to Build
1. **Daily Check-In System**
   - New models, endpoints, components

2. **Calendar System**
   - New views, endpoints, components

3. **Notification System** (enhance existing)
   - Badge counts
   - Reminders
   - Event requests

---

## 📊 Priority Matrix

### High Priority (Core Features)
1. ✅ Enhanced Nutrition Dashboard (ring chart, better UI)
2. ✅ Meal Detail Screen
3. ✅ Daily Check-In System
4. ✅ Calendar View

### Medium Priority (Enhancements)
1. ⚠️ Dashboard improvements
2. ⚠️ Workout logging enhancements
3. ⚠️ Progress visualization

### Low Priority (Nice to Have)
1. ⚪ Video integration
2. ⚪ Advanced analytics
3. ⚪ Social features

---

## 🛠️ Technical Architecture

### Backend Additions
```
app/models/
  - check_in.py (new)
  - calendar_event.py (new)

app/routers/
  - check_in.py (new)
  - calendar.py (new)

app/schemas/
  - check_in.py (new)
  - calendar.py (new)
```

### Frontend Additions
```
Frontend/src/
  components/
    - MacroRingChart.tsx (new)
    - DailyCheckIn.tsx (new)
    - CalendarView.tsx (new)
    - MealDetail.tsx (new)
    - ProgressCard.tsx (new)
    - RatingScale.tsx (new)
  
  pages/
    - CheckInPage.tsx (new)
    - CalendarPage.tsx (new)
    - MealDetailPage.tsx (new)
```

---

## 🎯 User Flows

### Daily Check-In Flow
1. User opens app → Dashboard shows check-in prompt
2. User clicks "Submit now" → Check-in form opens
3. User fills form → Submits
4. Streak updates → Dashboard reflects completion

### Meal Tracking Flow
1. User opens Nutrition tab → Sees daily macros with rings
2. User clicks meal → Meal detail opens
3. User views/adds foods → Nutrition updates
4. User completes meal → Checkmark appears

### Calendar Flow
1. User opens Calendar → Sees month with indicators
2. User selects day → Details show
3. User logs workout/meal → Calendar updates
4. User requests event → Notification sent to trainer

---

## 📝 Next Steps

1. **Review & Prioritize** - Discuss with client which features are most important
2. **Design Mockups** - Create detailed designs for each screen
3. **Technical Planning** - Detailed API design, database schema
4. **Implementation Plan** - Break down into sprints/tasks
5. **Prototype** - Build MVP of highest priority features

---

## ❓ Questions to Discuss

1. Which features are highest priority?
2. Do we have video content for exercises?
3. Should we integrate with fitness trackers (steps, etc.)?
4. What's the timeline/budget?
5. Should we maintain current desktop web app or focus on mobile?
6. Do we need real-time features (notifications, live updates)?

