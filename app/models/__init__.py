from app.models.user import User
from app.models.workout import Exercise, WorkoutPlan, WorkoutSession, WorkoutExercise, ExerciseCompletion
from app.models.nutrition import (
    NutritionPlan, Recipe, PlannedMeal, MealCompletion, WeighIn,
    MealPlan, MealEntry, MealComponent, MealUpload, NutritionEntry
)
from app.models.progress import ProgressEntry
from app.models.notification import Notification

# New meal and workout system models
from app.models.meal_system import (
    MealPlanV2 as NewMealPlan,
    MealSlot,
    MacroCategory,
    FoodOption,
    ClientMealChoice,
    MealTemplate,
    MacroType,
    DailyMealHistory
)
from app.models.workout_system import (
    WorkoutPlanV2 as NewWorkoutPlan,
    WorkoutDay,
    WorkoutExerciseV2 as NewWorkoutExercise,
    WorkoutSessionV2 as NewWorkoutSession,
    SetCompletion,
    ExercisePersonalRecord,
    WorkoutSplitType,
    DayType
)

__all__ = [
    "User",
    "Exercise",
    "WorkoutPlan",
    "WorkoutSession",
    "WorkoutExercise",
    "ExerciseCompletion",
    "NutritionPlan",
    "Recipe",
    "PlannedMeal",
    "MealCompletion",
    "WeighIn",
    "MealPlan",
    "MealEntry",
    "MealComponent",
    "MealUpload",
    "NutritionEntry",
    "ProgressEntry",
    "Notification",
    # New system models
    "NewMealPlan",
    "MealSlot",
    "MacroCategory",
    "FoodOption",
    "ClientMealChoice",
    "MealTemplate",
    "MacroType",
    "NewWorkoutPlan",
    "WorkoutDay",
    "NewWorkoutExercise",
    "NewWorkoutSession",
    "SetCompletion",
    "ExercisePersonalRecord",
    "WorkoutSplitType",
    "DayType",
]
