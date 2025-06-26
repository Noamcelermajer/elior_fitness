# 📱 **Elior Fitness - WebSocket Notification Scenarios**

> **Document Version:** 1.0  
> **Last Updated:** December 2024  
> **Sprint:** 5 - Real-time Notifications Implementation

---

## 🎯 **Overview**

This document outlines practical, user-focused notification scenarios for the Elior Fitness API WebSocket system. The goal is to provide meaningful, timely alerts without overwhelming users with notification spam.

---

## 👨‍⚕️ **TRAINER Receives Notifications When:**

### **📊 Client Activity Monitoring**
- Client hasn't logged any meals for **3+ days**
- Client missed **5 consecutive** planned workouts  
- Client hasn't uploaded progress photos for **2+ weeks**
- Client marked **3+ meals as "skipped"** in one day
- Client reported **difficulty/injury** during workout
- Client hasn't weighed in for **10+ days**

### **🎉 Client Achievements** 
- Client completed all planned meals for **7 days straight**
- Client reached their **weekly weight loss goal**
- Client finished their **first full workout plan**
- Client uploaded progress photos showing **visible change**
- Client hit a **new personal record** (weight lifted, workout time)
- Client achieved **monthly calorie target**

### **📋 Plan Interaction**
- Client **viewed their new nutrition plan** (confirmation)
- Client **requested modifications** to their workout plan
- Client **rated a recipe** (feedback for trainer)
- Client **asked a question** via direct message
- Client **completed their weekly meal prep**

### **💬 Communication Events**
- Client sent a **direct message**
- Client **uploaded progress photos**
- Client **submitted feedback** on workout difficulty
- Client **requested recipe substitutions**

---

## 👤 **CLIENT Receives Notifications When:**

### **✨ Personal Achievements**
- **"🎉 All meals logged today - great job!"**
- **"💪 Workout completed - you're on fire!"**
- **"📸 Progress photo uploaded successfully"** 
- **"🔥 7-day streak - you're crushing it!"**
- **"🎯 Weekly calorie goal achieved!"**
- **"💯 Perfect workout week completed!"**
- **"📈 New personal best recorded!"**

### **📋 Trainer Updates**
- **"📋 Your trainer updated your meal plan"**
- **"💪 New workout routine is ready for you"**
- **"👨‍⚕️ Your trainer left you feedback"**
- **"📝 New recipe added to your plan"**
- **"📊 Your trainer reviewed your progress"**
- **"🎯 Your goals have been adjusted"**

### **💬 Communication**
- **"💬 New message from your trainer"**
- **"❓ Your trainer answered your question"**
- **"👍 Your trainer liked your progress photo"**
- **"📝 Your trainer left workout feedback"**

### **🔔 Smart Reminders (Context-based)**
- **"🍽️ Don't forget lunch!"** (only if user usually logs it)
- **"💪 Workout scheduled for 3pm today"**
- **"📸 Weekly progress photo reminder"**
- **"⚖️ Time for your weekly weigh-in"**

---

## 🚨 **SYSTEM Notifications (Both Users):**

### **⚠️ Important Alerts**
- **"📱 App maintenance scheduled for tonight"**
- **"🔐 Please update your password for security"**
- **"📊 Monthly progress report is ready"**
- **"💳 Subscription renewal reminder"**
- **"🆕 New features available in the app"**

### **🎯 Engagement Alerts**
- **"🌟 You're in the top 10% of active users!"**
- **"🎉 Welcome to week 4 of your journey!"**
- **"💡 Tip: Try meal prepping on Sundays"**

---

## 📊 **Notification Timing & Frequency:**

### **⚡ Immediate (Real-time)**
- Meal logged → Trainer sees completion
- Plan updated → Client notified instantly  
- Message sent → Recipient gets alert
- Progress photo uploaded → Trainer alerted
- Achievement unlocked → Client celebrates

### **📅 Daily Summary (End of day)**
- **"📊 Daily summary: 3/4 meals completed"**
- **"💪 2 workouts this week - keep going!"**
- **"🎯 You're 85% towards your daily calorie goal"**

### **📈 Weekly Alerts (Sunday evening)**
- **"📈 Weekly progress: 85% meal compliance"**
- **"🎯 This week's achievements: 5 workouts completed"**
- **"🔥 Week 3 summary: You're on track!"**

### **🧠 Smart Alerts (Context-based)**
- Only notify trainer if client **inactive for 3+ days**
- Only remind client of workout if they **have one scheduled**
- Only celebrate streaks if client is **actively engaged**
- Adjust reminder timing based on **user's historical patterns**

---

## 🔕 **What WON'T Trigger Notifications:**

### **❌ Spam Prevention:**
- Every single meal upload (too frequent)
- Every weight entry (unless significant change)
- App opens/closes (irrelevant)
- Profile views (not actionable)
- Generic daily reminders (annoying)
- Recipe views without completion
- Minor plan adjustments

### **🚫 Respect User Preferences:**
- Notifications during **"quiet hours"** (9pm-8am)
- More than **3 notifications per day** per user
- **Duplicate notifications** for same event
- Notifications for **completed actions**
- Marketing messages during workout time

---

## 🎛️ **Notification Categories & Priorities:**

### **🔴 HIGH Priority (Immediate)**
- Trainer messages to client
- Plan updates from trainer
- Achievement milestones
- System security alerts

### **🟡 MEDIUM Priority (Within 1 hour)**
- Daily goal completions
- Weekly summaries
- Progress photo uploads
- Client questions to trainer

### **🟢 LOW Priority (Can be batched)**
- Gentle reminders
- Tips and motivational content
- Non-urgent system updates
- Historical milestone anniversaries

---

## 💻 **Frontend Implementation Requirements:**

### **🔔 Notification UI Components:**
- **Toast notifications** for immediate alerts
- **Badge counts** on relevant tabs
- **Notification center** with history
- **Achievement animations** for milestones
- **Sound/vibration** preferences

### **⚙️ User Preferences:**
- **Quiet hours** configuration
- **Notification type** toggles
- **Frequency** settings (immediate/daily/weekly)
- **Sound** preferences
- **Do Not Disturb** mode

---

## 🔧 **Technical Implementation Notes:**

### **📡 WebSocket Message Types:**
```typescript
enum NotificationType {
  FILE_UPLOADED = "file_uploaded",
  MEAL_COMPLETED = "meal_completed", 
  WORKOUT_COMPLETED = "workout_completed",
  PROGRESS_UPDATED = "progress_updated",
  PLAN_UPDATED = "plan_updated",
  ACHIEVEMENT_UNLOCKED = "achievement_unlocked",
  MESSAGE = "message",
  SYSTEM = "system"
}
```

### **📊 Notification Frequency Limits:**
- **Max 3 notifications per day** per user
- **Deduplicate** similar notifications within 1 hour
- **Smart timing** based on user activity patterns
- **Batch** low-priority notifications

### **🎯 Smart Filtering Rules:**
- Trainer gets **aggregated** client activity (not every action)
- Client gets **achievement-focused** positive notifications
- Both get **actionable** notifications they can respond to
- System notifications are **rare but important**

---

## 🚀 **Implementation Phases:**

### **Phase 1 - Current (Sprint 5)**
- ✅ File upload notifications
- ✅ Direct messaging
- ✅ System announcements

### **Phase 2 - Next Sprint**
- 🎯 Meal completion notifications
- 🎯 Achievement system
- 🎯 Plan update alerts

### **Phase 3 - Future**
- 📊 Smart activity monitoring
- 🧠 AI-powered engagement insights
- 📈 Advanced analytics notifications

---

## 📝 **Notes for Frontend Developers:**

1. **Test with real user flows** - notifications should enhance, not interrupt
2. **Implement notification preferences** early in development
3. **Design for both mobile and web** notification systems
4. **Consider offline scenarios** - queue notifications when app closed
5. **Add analytics** to track notification engagement rates

---

**Document Maintained By:** Development Team  
**Next Review:** After Sprint 5 completion  
**Related Documents:** 
- `SPRINT_5_IMPLEMENTATION_SUMMARY.md`
- `README.md` - WebSocket section 