# UI Differences - Reference vs Current Implementation

## Reference Image Analysis

### Layout Structure
1. **Video Thumbnail**: On LEFT side, inline with content (not a separate dialog button)
2. **Exercise Content**: On RIGHT side of video, horizontal flex layout
3. **Card Background**: Dark grey/black background
4. **Overall**: More compact, mobile-first design

### Exercise Card Details

#### Header Section
- **Reference**: Video LEFT, Title + Badge (A/B) RIGHT, Details below
- **Current**: Video is separate button/dialog, title above video

#### Details Format
- **Reference**: "Sets: 3", "Reps: 6 - 8", "Rest: 2m" (English labels)
- **Current**: "סטים: 3", "חזרות: 10-12", "מנוחה: 1m 30s" (Hebrew labels)

#### Completed Sets Display
- **Reference**: 
  - "15 kg" on one line
  - "14 reps" on another line
  - Checkmark in grey circle on RIGHT side
- **Current**: 
  - "10 חזרות · 20 ק״ג" (combined, Hebrew)
  - Checkmark on LEFT with text

#### Set Input Format
- **Reference**: Shows "kg" and "reps" labels (English)
- **Current**: Shows Hebrew labels

#### Bodyweight Checkbox
- **Reference**: "BW" label (English), positioned on right
- **Current**: "משקל גוף" (Hebrew), different position

#### Add Set Button
- **Reference**: "+ Add Set" (English)
- **Current**: "הוסף סט" (Hebrew)

### Visual Elements
1. **Checkmark**: Grey circle with white checkmark (reference) vs colored checkmark (current)
2. **Set numbers**: "01", "02", "03" format (same)
3. **Card spacing**: More compact in reference
4. **Colors**: Darker theme in reference

## Required Changes

1. Restructure exercise card layout: Video LEFT, Content RIGHT
2. Change completed sets format: Separate "X kg" and "Y reps" lines
3. Move checkmark to RIGHT side in grey circle
4. Change labels to English: "Sets:", "Reps:", "Rest:", "kg", "reps", "BW", "+ Add Set"
5. Update card styling to match darker theme
6. Make layout more compact




