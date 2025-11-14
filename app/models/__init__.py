from app.models.user import User
from app.models.workout import Exercise, WorkoutPlan, WorkoutSession, WorkoutExercise, ExerciseCompletion
from app.models.muscle_group import MuscleGroup
from app.models.workout_split import WorkoutSplit
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
    DailyMealHistory,
    MealBank
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
    "MuscleGroup",
    "WorkoutSplit",
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
    "DailyMealHistory",
    "MealBank",
    "NewWorkoutPlan",
    "WorkoutDay",
    "NewWorkoutExercise",
    "NewWorkoutSession",
    "SetCompletion",
    "ExercisePersonalRecord",
    "WorkoutSplitType",
    "DayType",
]
