from sqlalchemy import Boolean, Column, Integer, String, ForeignKey, DateTime, Float, Enum
from sqlalchemy.sql import func
from app.database import Base
import enum

class MealType(str, enum.Enum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"

class MealStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    SKIPPED = "skipped"

class NutritionPlan(Base):
    __tablename__ = "nutrition_plans"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    trainer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String)
    daily_calories = Column(Integer)
    protein_target = Column(Integer)  # in grams
    carbs_target = Column(Integer)    # in grams
    fat_target = Column(Integer)      # in grams
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    trainer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String)
    instructions = Column(String)
    calories = Column(Integer)
    protein = Column(Integer)
    carbs = Column(Integer)
    fat = Column(Integer)
    preparation_time = Column(Integer)  # in minutes
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PlannedMeal(Base):
    __tablename__ = "planned_meals"

    id = Column(Integer, primary_key=True, index=True)
    nutrition_plan_id = Column(Integer, ForeignKey("nutrition_plans.id"), nullable=False)
    recipe_id = Column(Integer, ForeignKey("recipes.id"))
    meal_type = Column(Enum(MealType), nullable=False)
    day_of_week = Column(Integer)  # 0-6 for Monday-Sunday
    time_of_day = Column(String)
    notes = Column(String)

class MealCompletion(Base):
    __tablename__ = "meal_completions"

    id = Column(Integer, primary_key=True, index=True)
    planned_meal_id = Column(Integer, ForeignKey("planned_meals.id"), nullable=False)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(MealStatus), nullable=False)
    photo_path = Column(String)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(String)

class WeighIn(Base):
    __tablename__ = "weigh_ins"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    weight = Column(Float, nullable=False)  # in kg
    body_fat = Column(Float)  # percentage
    notes = Column(String)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now()) 