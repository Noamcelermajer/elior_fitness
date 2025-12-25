# Bugs Summary - Quick Reference

## 🚨 Critical Issues (Fix First)

1. **Weight Addition Modal Not Closing** - Modal stays open after clicking "Add"
2. **Progress Images Not Loading** - Images show "not found" until clicked, then rotated

## ⚠️ Important Issues

3. **Image Rotation** - Images rotated 90° counterclockwise in progress forms
4. **Language Reset** - App resets to Hebrew on close/reopen

## 📝 Minor Issues

5. **Weight Chart Title** - Shows translation key "progress.weightChart" in English

---

## 🔧 Quick Fixes Needed

- **Image Orientation**: Handle EXIF data properly
- **Modal State**: Close modal after successful submission
- **Image Loading**: Fix lazy loading/thumbnail display
- **Language Persistence**: Save language preference to localStorage
- **Translation**: Add missing English translation for weight chart

---

## 📊 Impact Analysis

| Issue | User Impact | Frequency | Urgency |
|-------|-------------|-----------|---------|
| Modal not closing | High | Every weight entry | High |
| Images not loading | High | Every image view | High |
| Image rotation | Medium | Every image upload | Medium |
| Language reset | Medium | Every app restart | Medium |
| Translation key | Low | English users only | Low |

---

**See `BUGS_REPORTED.md` for detailed analysis**

