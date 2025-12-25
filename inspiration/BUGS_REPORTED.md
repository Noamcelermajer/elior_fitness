# Client Reported Bugs - Bug Tracking Document

**Status**: Planning Phase - Not Yet Implemented  
**Date**: December 2025  
**Language**: Hebrew (translated below)

---

## 🐛 Bug List

### 1. General Application Issues

#### Bug #1: Language Reset on App Close
**Hebrew**: `בעת יציאה מהאפליקציה וסגירתה, היא חוזרת אוטומטית לשפה העברית.`

**Translation**: When exiting and closing the application, it automatically returns to Hebrew language.

**Category**: Localization / State Management  
**Severity**: Medium  
**Priority**: Medium

**Description**:
- User selects a language (presumably English)
- User closes/exits the app
- When app reopens, language resets to Hebrew instead of remembering user preference

**Expected Behavior**:
- App should remember user's language preference
- Language should persist across app sessions
- Should use localStorage or similar persistence mechanism

**Technical Notes**:
- Check i18n configuration
- Verify localStorage/sessionStorage for language preference
- Check if language state is being reset on app initialization

---

### 2. Progress Menu Issues

#### Bug #2: Weight Addition Modal Not Closing
**Hebrew**: `בעת הוספת משקל - החלונית של הוספת המשקל ביחד עם התמונה שמצורפת אינה נסגרת בעת לחיצה על כפתור ״הוסף״.`

**Translation**: When adding weight - the weight addition panel together with the attached image does not close when clicking the "Add" button.

**Category**: UI/UX - Modal/Dialog  
**Severity**: High  
**Priority**: High

**Description**:
- User opens weight addition dialog/modal
- User attaches an image
- User clicks "Add" button
- Modal/dialog does not close after submission
- Image remains visible

**Expected Behavior**:
- Modal should close after successful submission
- Image should be cleared/reset
- User should see confirmation or return to previous view

**Technical Notes**:
- Check modal state management
- Verify form submission handler
- Check if success callback is properly closing modal
- Verify image state is being reset

---

#### Bug #3: Image Rotation in Progress Entry Field
**Hebrew**: `בשדה של הזנת התקדמות, בתמונה המצורפת - היא מסובבת 90 מעלות נגד כוון השעון.`

**Translation**: In the progress entry field, the attached image - it is rotated 90 degrees counterclockwise.

**Category**: Image Processing / Display  
**Severity**: Medium  
**Priority**: Medium

**Description**:
- User uploads/attaches an image in progress entry form
- Image displays rotated 90 degrees counterclockwise
- Image orientation is incorrect

**Expected Behavior**:
- Image should display in correct orientation
- Should respect EXIF orientation data
- Should auto-rotate based on image metadata

**Technical Notes**:
- Check image upload/display component
- Verify EXIF orientation handling
- May need image rotation correction
- Check if image processing library handles orientation

---

#### Bug #4: Weight Chart Title Translation
**Hebrew**: `בגרף של התקדמות משקל, הכותרת באנגלית היא progress.weightChart כאשר בעברית היא ״תרשים משקל״ כנדרש.`

**Translation**: In the weight progress chart, the title in English is "progress.weightChart" when in Hebrew it is "תרשים משקל" as required.

**Category**: Localization / Translation  
**Severity**: Low  
**Priority**: Medium

**Description**:
- Weight chart displays translation key "progress.weightChart" instead of translated text
- Hebrew translation works correctly ("תרשים משקל")
- English translation is missing or not applied

**Expected Behavior**:
- English should show "Weight Chart" or appropriate translation
- Should not show translation key
- Both languages should display proper translations

**Technical Notes**:
- Check i18n translation files
- Verify translation key exists for English
- Check if translation is being applied correctly
- May be missing translation in en.json

---

#### Bug #5: Progress Images Not Displaying Initially
**Hebrew**: `בתפריט של תמונות ההתקדמות, התמונה נראית רק לאחר לחיצה על ההזנה (במבט מהיר מופיע אייקון מלצמה עם הכתב ״התמונה אינה נמצאת״), גם כאן - התמונה מסובבת 90 מעלות.`

**Translation**: In the progress images menu, the image is only visible after clicking on the entry (at a quick glance, a placeholder icon appears with the text "התמונה אינה נמצאת" - "Image not found"), and here too - the image is rotated 90 degrees.

**Category**: Image Display / Loading  
**Severity**: High  
**Priority**: High

**Description**:
- In progress images menu/list
- Images don't display initially
- Shows placeholder icon with "Image not found" text
- Image only appears after clicking on entry
- When image does appear, it's rotated 90 degrees

**Expected Behavior**:
- Images should load and display in list view
- Should show thumbnail/preview immediately
- Should not show "not found" placeholder if image exists
- Image should be in correct orientation

**Technical Notes**:
- Check image loading/lazy loading implementation
- Verify image path/URL construction
- Check if images are being fetched correctly
- May be issue with image server/CDN
- Check image caching
- Same rotation issue as Bug #3 - likely same root cause

---

## 📊 Bug Summary

| Bug # | Category | Severity | Priority | Status |
|-------|----------|----------|----------|--------|
| #1 | Localization | Medium | Medium | Planning |
| #2 | UI/UX | High | High | Planning |
| #3 | Image Processing | Medium | Medium | Planning |
| #4 | Localization | Low | Medium | Planning |
| #5 | Image Display | High | High | Planning |

**Total Bugs**: 5  
**High Priority**: 2  
**Medium Priority**: 3  
**Low Priority**: 1

---

## 🔍 Common Patterns

### Image Issues (Bugs #3, #5)
- **Pattern**: Image rotation problems
- **Likely Cause**: EXIF orientation not being handled
- **Solution**: Implement image orientation correction
- **Affected Areas**: Progress entry, Progress images menu

### Localization Issues (Bugs #1, #4)
- **Pattern**: Language/translation problems
- **Likely Cause**: i18n configuration or missing translations
- **Solution**: Review i18n setup and translation files
- **Affected Areas**: App-wide, Weight chart

### Modal/State Issues (Bug #2)
- **Pattern**: Modal not closing after action
- **Likely Cause**: State management issue
- **Solution**: Verify modal close handlers
- **Affected Areas**: Weight addition dialog

---

## 🎯 Implementation Priority (When Ready)

### Phase 1: Critical Fixes
1. **Bug #2**: Weight addition modal not closing (High impact on UX)
2. **Bug #5**: Progress images not displaying (High impact on functionality)

### Phase 2: Important Fixes
3. **Bug #3**: Image rotation in progress entry (Affects user experience)
4. **Bug #1**: Language reset (Affects user preference)

### Phase 3: Polish
5. **Bug #4**: Weight chart title translation (Low impact, easy fix)

---

## 📝 Technical Investigation Needed

### Before Implementation:
1. **Image Handling**:
   - Review current image upload/display implementation
   - Check if EXIF data is being read
   - Verify image processing pipeline
   - Test with various image orientations

2. **Localization**:
   - Review i18n configuration
   - Check translation files (en.json, he.json)
   - Verify language persistence mechanism
   - Test language switching

3. **Modal/Dialog State**:
   - Review modal component implementation
   - Check form submission handlers
   - Verify state cleanup on close
   - Test modal close scenarios

4. **Image Loading**:
   - Review image loading strategy
   - Check lazy loading implementation
   - Verify image path construction
   - Test image server/CDN access

---

## 🔗 Related Files to Review (When Implementing)

### Image Handling:
- Image upload components
- Image display components
- Image processing utilities
- EXIF data handlers

### Localization:
- `Frontend/src/i18n/config.ts`
- `Frontend/src/i18n/locales/en.json`
- `Frontend/src/i18n/locales/he.json`
- Language context/provider

### Progress/Weight:
- Progress entry components
- Weight chart components
- Progress image gallery
- Modal/dialog components

---

## ✅ Notes

- All bugs are documented for planning phase
- No implementation should be done until planning is complete
- These bugs should be considered when designing new features
- Some bugs may be resolved by implementing inspiration app features
- Image rotation issues may be fixed by improving image handling system

---

**Last Updated**: December 2025  
**Status**: Planning Phase - Awaiting Implementation Approval

