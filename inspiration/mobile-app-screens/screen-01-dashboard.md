# Screen 1: Dashboard/Home Screen

## Visual Description
Dark-themed mobile dashboard with personalized greeting, daily check-in section, and progress tracking cards.

## Key Elements

### Header Section
- **Profile Avatar**: Grey square with white barbell icon
- **Greeting**: "Hi there" + Hebrew name "אליאור קרמיזי" (Elior Karmizi)
- **Icons**: 
  - Messages (speech bubble)
  - Notifications (bell with red badge showing "1")

### Daily Check-In Section
- **Title**: "Daily Check-In" with arrow
- **Streak Display**: "11 DAY STREAK" with flame emoji 🔥
- **Check-In Days**: Horizontal row showing:
  - MON 22 ✓
  - TUE 23 ✓
  - WED 24 ✓
  - THU 25 ✓
- **Action Card**: Blue card saying "You missed your check-in. Submit now."
- **Skip Option**: "Skip this check-in" link

### Progress Cards (Grid Layout)

#### Weight Card
- **Title**: "WEIGHT"
- **Value**: "71.5 KG" with upward arrow
- **Label**: "Today"
- **Mini Graph**: 4-day trend (Dec 22-25) showing upward trend

#### Water Tracker Card
- **Title**: "WATER TRACKER"
- **Progress**: "0L | 3L" (0 out of 3 liters)
- **Visual**: Vertical progress bar (empty)
- **Markers**: 100% at top, 50% in middle

#### Steps Card
- **Title**: "STEPS"
- **Status**: "No data to show"

### Bottom Navigation
- Home (selected)
- Workout
- Nutrition
- Calendar
- More

## Design Patterns
- Card-based layout
- Color-coded progress indicators
- Streak visualization
- Quick action prompts
- Notification badges

## Implementation Notes
- Need to track daily check-ins
- Streak calculation logic
- Progress card components
- Mini graph for weight
- Water intake tracking system

