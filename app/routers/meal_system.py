"""
API endpoints for the new meal system
Trainers can create meal plans with 3 macros and food options
"""

from collections import defaultdict
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Any, Optional

from app.database import get_db
from app.auth.utils import get_current_user
from app.schemas.auth import UserResponse, UserRole
from app.schemas.meal_system import (
    MealPlanCreate,
    MealPlanUpdate,
    MealPlanResponse,
    CompleteMealPlanCreate,
    MealSlotCreate,
    MealSlotUpdate,
    MealSlotResponse,
    MacroCategoryCreate,
    FoodOptionCreate,
    FoodOptionUpdate,
    FoodOptionResponse,
    ClientMealChoiceCreate,
    ClientMealChoiceUpdate,
    ClientMealChoiceResponse,
    DailyMealHistoryCreate,
    DailyMealHistoryResponse,
    MealHistoryChoiceResponse,
    MealCompletionStatusCreate,
    MealCompletionStatusResponse,
    MealBankCreate,
    MealBankUpdate,
    MealBankResponse,
)
from app.models.meal_system import (
    MealPlanV2 as NewMealPlan,
    MealSlot,
    MacroCategory,
    FoodOption,
    ClientMealChoice,
    MacroType,
    DailyMealHistory,
    MealBank,
    MealCompletionStatus,
)

router = APIRouter()


def _normalize_date(value: datetime) -> datetime:
    """Normalize a datetime to the start of the day for consistent storage."""
    return value.replace(hour=0, minute=0, second=0, microsecond=0)


# ============ Meal Plan Endpoints ============

@router.post("/plans", response_model=MealPlanResponse, status_code=status.HTTP_201_CREATED)
def create_meal_plan(
    plan_data: MealPlanCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new meal plan (trainer only)"""
    if current_user.role != UserRole.TRAINER and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can create meal plans"
        )
    
    # Enforce single active plan per client
    existing_plan = db.query(NewMealPlan).filter(
        NewMealPlan.client_id == plan_data.client_id,
        NewMealPlan.is_active == True
    ).first()

    if existing_plan:
        if existing_plan.trainer_id != current_user.id and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Client already has an active meal plan assigned by another trainer"
            )

        updatable_fields = [
            "name",
            "description",
            "number_of_meals",
            "total_calories",
            "protein_target",
            "carb_target",
            "fat_target",
            "start_date",
            "end_date",
        ]

        for field in updatable_fields:
            setattr(existing_plan, field, getattr(plan_data, field))

        existing_plan.trainer_id = current_user.id
        existing_plan.is_active = plan_data.is_active

        db.commit()
        db.refresh(existing_plan)
        return existing_plan

    # Create meal plan
    meal_plan = NewMealPlan(
        client_id=plan_data.client_id,
        trainer_id=current_user.id,
        name=plan_data.name,
        description=plan_data.description,
        number_of_meals=plan_data.number_of_meals,
        total_calories=plan_data.total_calories,
        protein_target=plan_data.protein_target,
        carb_target=plan_data.carb_target,
        fat_target=plan_data.fat_target,
        is_active=plan_data.is_active,
        start_date=plan_data.start_date,
        end_date=plan_data.end_date
    )
    
    db.add(meal_plan)
    db.commit()
    db.refresh(meal_plan)
    
    return meal_plan

@router.post("/plans/complete", response_model=MealPlanResponse, status_code=status.HTTP_201_CREATED)
def create_complete_meal_plan(
    plan_data: CompleteMealPlanCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a complete meal plan with all meals and food options at once (trainer only)"""
    if current_user.role != UserRole.TRAINER and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can create meal plans"
        )
    
    existing_plan = db.query(NewMealPlan).filter(
        NewMealPlan.client_id == plan_data.client_id,
        NewMealPlan.is_active == True
    ).first()

    if existing_plan:
        if existing_plan.trainer_id != current_user.id and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Client already has an active meal plan assigned by another trainer"
            )

        existing_plan.name = plan_data.name
        existing_plan.description = plan_data.description
        existing_plan.number_of_meals = plan_data.number_of_meals
        existing_plan.total_calories = plan_data.total_calories
        existing_plan.protein_target = plan_data.protein_target
        existing_plan.carb_target = plan_data.carb_target
        existing_plan.fat_target = plan_data.fat_target
        existing_plan.trainer_id = current_user.id
        existing_plan.is_active = True

        existing_plan.meal_slots.clear()
        db.flush()

        target_plan = existing_plan
    else:
        target_plan = NewMealPlan(
            client_id=plan_data.client_id,
            trainer_id=current_user.id,
            name=plan_data.name,
            description=plan_data.description,
            number_of_meals=plan_data.number_of_meals,
            total_calories=plan_data.total_calories,
            protein_target=plan_data.protein_target,
            carb_target=plan_data.carb_target,
            fat_target=plan_data.fat_target
        )
        db.add(target_plan)
        db.flush()

    for order_index, slot_data in enumerate(plan_data.meal_slots):
        meal_slot = MealSlot(
            meal_plan_id=target_plan.id,
            name=slot_data.name,
            order_index=order_index,
            time_suggestion=slot_data.time_suggestion,
            target_calories=slot_data.target_calories,
            target_protein=slot_data.target_protein,
            target_carbs=slot_data.target_carbs,
            target_fat=slot_data.target_fat,
        )
        db.add(meal_slot)
        db.flush()

        for macro_data in slot_data.macro_categories:
            macro_category = MacroCategory(
                meal_slot_id=meal_slot.id,
                macro_type=macro_data.macro_type,
                quantity_instruction=macro_data.quantity_instruction
            )
            db.add(macro_category)
            db.flush()

            for food_data in macro_data.food_options:
                food_option = FoodOption(
                    macro_category_id=macro_category.id,
                    name=food_data.name,
                    name_hebrew=food_data.name_hebrew,
                    calories=food_data.calories,
                    protein=food_data.protein,
                    carbs=food_data.carbs,
                    fat=food_data.fat,
                    serving_size=food_data.serving_size
                )
                db.add(food_option)

    db.commit()
    db.refresh(target_plan)

    return target_plan

@router.get("/plans", response_model=List[MealPlanResponse])
def get_meal_plans(
    client_id: int = None,
    active_only: bool = True,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get meal plans (trainers see their plans, admins see all, clients see their own)"""
    query = db.query(NewMealPlan)
    
    if current_user.role == "CLIENT":
        query = query.filter(NewMealPlan.client_id == current_user.id)
    elif current_user.role == UserRole.TRAINER:
        query = query.filter(NewMealPlan.trainer_id == current_user.id)
    # Admins see all
    
    if client_id:
        query = query.filter(NewMealPlan.client_id == client_id)
    
    if active_only:
        query = query.filter(NewMealPlan.is_active == True)
    
    return query.all()

@router.get("/plans/{plan_id}", response_model=MealPlanResponse)
def get_meal_plan(
    plan_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific meal plan"""
    meal_plan = db.query(NewMealPlan).filter(NewMealPlan.id == plan_id).first()
    
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    # Check permissions
    if current_user.role == UserRole.CLIENT and meal_plan.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this meal plan")
    elif current_user.role == UserRole.TRAINER and meal_plan.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this meal plan")
    
    return meal_plan

@router.put("/plans/{plan_id}", response_model=MealPlanResponse)
def update_meal_plan(
    plan_id: int,
    plan_data: MealPlanUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a meal plan (trainer only)"""
    if current_user.role != UserRole.TRAINER and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only trainers can update meal plans")
    
    meal_plan = db.query(NewMealPlan).filter(NewMealPlan.id == plan_id).first()
    
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    if current_user.role == UserRole.TRAINER and meal_plan.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this meal plan")
    
    # Update fields
    for field, value in plan_data.dict(exclude_unset=True).items():
        setattr(meal_plan, field, value)
    
    db.commit()
    db.refresh(meal_plan)
    
    return meal_plan

@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal_plan(
    plan_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a meal plan (trainer only)"""
    if current_user.role != UserRole.TRAINER and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only trainers can delete meal plans")
    
    meal_plan = db.query(NewMealPlan).filter(NewMealPlan.id == plan_id).first()
    
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    if current_user.role == UserRole.TRAINER and meal_plan.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this meal plan")
    
    db.delete(meal_plan)
    db.commit()
    
    return None

# ============ Meal Slot Endpoints ============

@router.post("/plans/{plan_id}/slots", response_model=MealSlotResponse, status_code=status.HTTP_201_CREATED)
def add_meal_slot(
    plan_id: int,
    slot_data: MealSlotCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a meal slot to a plan (trainer only)"""
    if current_user.role != UserRole.TRAINER and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only trainers can add meal slots")
    
    # Verify plan exists and trainer owns it
    meal_plan = db.query(NewMealPlan).filter(NewMealPlan.id == plan_id).first()
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    if current_user.role == UserRole.TRAINER and meal_plan.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    meal_slot = MealSlot(
        meal_plan_id=plan_id,
        name=slot_data.name,
        order_index=slot_data.order_index,
        time_suggestion=slot_data.time_suggestion,
        notes=slot_data.notes,
        target_calories=slot_data.target_calories,
        target_protein=slot_data.target_protein,
        target_carbs=slot_data.target_carbs,
        target_fat=slot_data.target_fat,
    )
    
    db.add(meal_slot)
    db.commit()
    db.refresh(meal_slot)
    
    return meal_slot

# ============ Food Option Endpoints ============

@router.post("/macro-categories/{macro_id}/foods", response_model=FoodOptionResponse, status_code=status.HTTP_201_CREATED)
def add_food_option(
    macro_id: int,
    food_data: FoodOptionCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a food option to a macro category (trainer only)"""
    if current_user.role != UserRole.TRAINER and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only trainers can add food options")
    
    food_option = FoodOption(
        macro_category_id=macro_id,
        name=food_data.name,
        name_hebrew=food_data.name_hebrew,
        calories=food_data.calories,
        protein=food_data.protein,
        carbs=food_data.carbs,
        fat=food_data.fat,
        serving_size=food_data.serving_size,
        notes=food_data.notes,
        order_index=food_data.order_index
    )
    
    db.add(food_option)
    db.commit()
    db.refresh(food_option)
    
    return food_option

@router.put("/foods/{food_id}", response_model=FoodOptionResponse)
def update_food_option(
    food_id: int,
    food_data: FoodOptionUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a food option (trainer only)"""
    if current_user.role != UserRole.TRAINER and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only trainers can update food options")
    
    food_option = db.query(FoodOption).filter(FoodOption.id == food_id).first()
    
    if not food_option:
        raise HTTPException(status_code=404, detail="Food option not found")
    
    for field, value in food_data.dict(exclude_unset=True).items():
        setattr(food_option, field, value)
    
    db.commit()
    db.refresh(food_option)
    
    return food_option

@router.delete("/foods/{food_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_food_option(
    food_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a food option (trainer only)"""
    if current_user.role != UserRole.TRAINER and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only trainers can delete food options")
    
    food_option = db.query(FoodOption).filter(FoodOption.id == food_id).first()
    
    if not food_option:
        raise HTTPException(status_code=404, detail="Food option not found")
    
    db.delete(food_option)
    db.commit()
    
    return None

# ============ Client Meal Choice Endpoints (for client tracking) ============

@router.post("/choices", response_model=ClientMealChoiceResponse, status_code=status.HTTP_201_CREATED)
def record_meal_choice(
    choice_data: ClientMealChoiceCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record a client's meal choice (client only)"""
    if current_user.role != "CLIENT":
        raise HTTPException(status_code=403, detail="Only clients can record meal choices")
    
    # Validate: either food_option_id (for meal plan foods) or custom food fields must be provided
    if not choice_data.food_option_id and not choice_data.custom_food_name:
        raise HTTPException(status_code=400, detail="Either food_option_id or custom_food_name must be provided")
    
    if choice_data.food_option_id and not choice_data.meal_slot_id:
        raise HTTPException(status_code=400, detail="meal_slot_id is required when logging a plan food option")
    
    choice = ClientMealChoice(
        client_id=current_user.id,
        food_option_id=choice_data.food_option_id,
        meal_slot_id=choice_data.meal_slot_id,
        date=choice_data.date,
        quantity=choice_data.quantity,
        photo_path=choice_data.photo_path,
        custom_food_name=choice_data.custom_food_name,
        custom_calories=choice_data.custom_calories,
        custom_protein=choice_data.custom_protein,
        custom_carbs=choice_data.custom_carbs,
        custom_fat=choice_data.custom_fat
    )
    
    db.add(choice)
    db.commit()
    db.refresh(choice)
    
    return choice

@router.get("/choices", response_model=List[ClientMealChoiceResponse])
def get_meal_choices(
    client_id: int = None,
    date: str = None,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get meal choices (trainers see their clients, clients see their own)"""
    from datetime import datetime, timedelta, timezone

    query = db.query(ClientMealChoice)
    
    if current_user.role == "CLIENT":
        query = query.filter(ClientMealChoice.client_id == current_user.id)
    elif current_user.role == UserRole.TRAINER and client_id:
        query = query.filter(ClientMealChoice.client_id == client_id)
    elif client_id:
        query = query.filter(ClientMealChoice.client_id == client_id)
    
    if date:
        try:
            target_date = datetime.fromisoformat(date.replace("Z", "+00:00"))
            if target_date.tzinfo:
                target_date = target_date.astimezone(timezone.utc).replace(tzinfo=None)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        query = query.filter(
            ClientMealChoice.date >= start_of_day,
            ClientMealChoice.date < end_of_day
        )
    
    return query.order_by(ClientMealChoice.date.desc()).all()

@router.put("/choices/{choice_id}", response_model=ClientMealChoiceResponse)
def update_meal_choice(
    choice_id: int,
    choice_data: ClientMealChoiceUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a meal choice (trainer for approval, client for their own)"""
    choice = db.query(ClientMealChoice).filter(ClientMealChoice.id == choice_id).first()
    
    if not choice:
        raise HTTPException(status_code=404, detail="Meal choice not found")
    
    # Clients can only update their own choices
    if current_user.role == UserRole.CLIENT and choice.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for field, value in choice_data.dict(exclude_unset=True).items():
        setattr(choice, field, value)
    
    db.commit()
    db.refresh(choice)
    
    return choice

@router.delete("/choices/{choice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal_choice(
    choice_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a meal choice"""
    choice = db.query(ClientMealChoice).filter(ClientMealChoice.id == choice_id).first()
    
    if not choice:
        raise HTTPException(status_code=404, detail="Meal choice not found")
    
    if current_user.role == UserRole.CLIENT and choice.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(choice)
    db.commit()
    
    return None

@router.get("/daily-macros")
def get_daily_macros(
    client_id: int = None,
    date: str = None,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculate daily macro consumption for a client on a specific date"""
    from datetime import datetime, timedelta, timezone
    
    # Determine which client to query
    target_client_id = client_id if client_id else current_user.id
    
    # Permission check
    if current_user.role == UserRole.CLIENT and target_client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Parse date or use today
    if date:
        try:
            parsed_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")
        if parsed_date.tzinfo:
            parsed_date = parsed_date.astimezone(timezone.utc).replace(tzinfo=None)
        target_date = parsed_date
    else:
        target_date = datetime.now()
    
    # Get date range (start and end of day)
    start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)
    
    # Get all meal choices for this day
    choices = db.query(ClientMealChoice).filter(
        ClientMealChoice.client_id == target_client_id,
        ClientMealChoice.date >= start_of_day,
        ClientMealChoice.date < end_of_day
    ).all()
    
    # Calculate totals
    total_calories = 0
    total_protein = 0
    total_carbs = 0
    total_fat = 0
    
    for choice in choices:
        # Check if this is a custom food or a meal plan food
        if choice.custom_food_name:
            # Custom food - use stored values directly
            if choice.custom_calories:
                total_calories += choice.custom_calories
            if choice.custom_protein:
                total_protein += choice.custom_protein
            if choice.custom_carbs:
                total_carbs += choice.custom_carbs
            if choice.custom_fat:
                total_fat += choice.custom_fat
        elif choice.food_option_id:
            # Meal plan food - calculate based on quantity
            food_option = db.query(FoodOption).filter(FoodOption.id == choice.food_option_id).first()
            
            if not food_option:
                continue
            
            # Parse quantity (e.g., "150g" or "150")
            grams_consumed = 100  # Default serving size
            if choice.quantity:
                try:
                    # Extract number from string like "150g" or "150"
                    import re
                    match = re.search(r'(\d+(?:\.\d+)?)', choice.quantity)
                    if match:
                        grams_consumed = float(match.group(1))
                except:
                    pass
            
            # Calculate macros based on grams consumed
            # Food options nutritional values are stored per 100g, so we scale based on 100g
            # The serving_size field is just a recommendation, not the base for calculations
            base_grams = 100  # Nutritional values are always per 100g
            
            # Scale factor: if user ate 150g and nutrition is per 100g, scale = 1.5
            scale = grams_consumed / base_grams if base_grams > 0 else 1
            
            # Add to totals
            if food_option.calories is not None:
                total_calories += food_option.calories * scale
            if food_option.protein is not None:
                total_protein += food_option.protein * scale
            if food_option.carbs is not None:
                total_carbs += food_option.carbs * scale
            if food_option.fat is not None:
                total_fat += food_option.fat * scale
    
    # Get client's meal plan targets
    meal_plan = db.query(NewMealPlan).filter(
        NewMealPlan.client_id == target_client_id,
        NewMealPlan.is_active == True
    ).first()
    
    targets = {
        "calories": meal_plan.total_calories if meal_plan and meal_plan.total_calories else 2000,
        "protein": meal_plan.protein_target if meal_plan and meal_plan.protein_target else 150,
        "carbs": meal_plan.carb_target if meal_plan and meal_plan.carb_target else 200,
        "fat": meal_plan.fat_target if meal_plan and meal_plan.fat_target else 60
    }
    
    return {
        "date": target_date.date().isoformat(),
        "consumed": {
            "calories": round(total_calories, 1),
            "protein": round(total_protein, 1),
            "carbs": round(total_carbs, 1),
            "fat": round(total_fat, 1)
        },
        "targets": targets,
        "remaining": {
            "calories": round(targets["calories"] - total_calories, 1),
            "protein": round(targets["protein"] - total_protein, 1),
            "carbs": round(targets["carbs"] - total_carbs, 1),
            "fat": round(targets["fat"] - total_fat, 1)
        },
        "percentages": {
            "calories": round((total_calories / targets["calories"] * 100) if targets["calories"] > 0 else 0, 1),
            "protein": round((total_protein / targets["protein"] * 100) if targets["protein"] > 0 else 0, 1),
            "carbs": round((total_carbs / targets["carbs"] * 100) if targets["carbs"] > 0 else 0, 1),
            "fat": round((total_fat / targets["fat"] * 100) if targets["fat"] > 0 else 0, 1)
        }
    }

# ============ Daily Meal History Endpoints ============

@router.post("/history", response_model=DailyMealHistoryResponse, status_code=status.HTTP_201_CREATED)
def save_daily_meal_history(
    history_data: DailyMealHistoryCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Save or update daily meal history"""
    from datetime import datetime
    
    # Ensure clients can only save their own history
    client_id = history_data.client_id if history_data.client_id else current_user.id
    if current_user.role == UserRole.CLIENT and client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if history already exists for this date
    start_of_day = history_data.date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    existing_history = db.query(DailyMealHistory).filter(
        DailyMealHistory.client_id == client_id,
        DailyMealHistory.date >= start_of_day,
        DailyMealHistory.date <= end_of_day
    ).first()
    
    if existing_history:
        # Update existing
        existing_history.total_calories = history_data.total_calories
        existing_history.total_protein = history_data.total_protein
        existing_history.total_carbs = history_data.total_carbs
        existing_history.total_fat = history_data.total_fat
        existing_history.is_complete = history_data.is_complete
        db.commit()
        db.refresh(existing_history)
        return existing_history
    else:
        # Create new
        new_history = DailyMealHistory(
            client_id=client_id,
            date=history_data.date,
            total_calories=history_data.total_calories,
            total_protein=history_data.total_protein,
            total_carbs=history_data.total_carbs,
            total_fat=history_data.total_fat,
            is_complete=history_data.is_complete
        )
        db.add(new_history)
        db.commit()
        db.refresh(new_history)
        return new_history

@router.get("/history", response_model=List[DailyMealHistoryResponse])
def get_meal_history(
    client_id: int = None,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get meal history for a client"""
    target_client_id = client_id if client_id else current_user.id
    
    # Permission check
    if current_user.role == UserRole.CLIENT and target_client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    history_entries = db.query(DailyMealHistory).filter(
        DailyMealHistory.client_id == target_client_id
    ).order_by(DailyMealHistory.date.desc()).all()
    
    from datetime import timedelta
    import re

    detailed_history: List[Dict[str, Any]] = []

    for entry in history_entries:
        start_of_day = entry.date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)

        choices = (
            db.query(ClientMealChoice)
            .options(
                joinedload(ClientMealChoice.food_option)
                .joinedload(FoodOption.macro_category)
                .joinedload(MacroCategory.meal_slot)
            )
            .filter(
                ClientMealChoice.client_id == target_client_id,
                ClientMealChoice.date >= start_of_day,
                ClientMealChoice.date < end_of_day,
            )
            .all()
        )

        slot_ids = {choice.meal_slot_id for choice in choices if choice.meal_slot_id}
        slot_map: Dict[int, MealSlot] = {}
        if slot_ids:
            slot_map = {
                slot.id: slot
                for slot in db.query(MealSlot).filter(MealSlot.id.in_(slot_ids)).all()
            }

        completion_rows = (
            db.query(MealCompletionStatus)
            .filter(
                MealCompletionStatus.client_id == target_client_id,
                MealCompletionStatus.date == _normalize_date(start_of_day),
            )
            .all()
        )
        completion_map = {row.meal_slot_id: row.is_completed for row in completion_rows}

        meals_map: Dict[str, Dict[str, Any]] = {}

        def parse_quantity(quantity: Optional[str]) -> float:
            if not quantity:
                return 100.0
            match = re.search(r"(\d+(?:\.\d+)?)", quantity)
            if match:
                try:
                    return float(match.group(1))
                except ValueError:
                    return 100.0
            return 100.0

        def scale_value(value: Optional[float], scale: float) -> Optional[float]:
            if value is None:
                return None
            return round(value * scale, 1)

        for choice in choices:
            associated_slot = None
            if choice.meal_slot_id:
                associated_slot = slot_map.get(choice.meal_slot_id)
            if not associated_slot and choice.food_option:
                macro_category = choice.food_option.macro_category
                if macro_category and macro_category.meal_slot:
                    associated_slot = macro_category.meal_slot

            if associated_slot:
                meal_key = f"slot-{associated_slot.id}"
                meal_entry = meals_map.setdefault(
                    meal_key,
                    {
                        "meal_slot_id": associated_slot.id,
                        "meal_name": associated_slot.name,
                        "time_suggestion": associated_slot.time_suggestion,
                        "choices": [],
                        "order_index": associated_slot.order_index or 0,
                        "is_completed": completion_map.get(associated_slot.id, False),
                    },
                )
            else:
                meal_entry = meals_map.setdefault(
                    "custom",
                    {
                        "meal_slot_id": None,
                        "meal_name": "Custom Entries",
                        "time_suggestion": None,
                        "choices": [],
                        "order_index": 999,
                        "is_completed": False,
                    },
                )

            calories_value: Optional[float] = None
            protein_value: Optional[float] = None
            carbs_value: Optional[float] = None
            fat_value: Optional[float] = None
            macro_type_value: Optional[MacroType] = None
            food_name: Optional[str] = None
            food_name_hebrew: Optional[str] = None

            if choice.food_option:
                food_option = choice.food_option
                food_name = food_option.name
                food_name_hebrew = food_option.name_hebrew
                macro_category = food_option.macro_category
                if macro_category:
                    macro_type_value = macro_category.macro_type

                grams_consumed = parse_quantity(choice.quantity)
                scale = grams_consumed / 100 if grams_consumed else 1

                calories_value = scale_value(food_option.calories, scale)
                protein_value = scale_value(food_option.protein, scale)
                carbs_value = scale_value(food_option.carbs, scale)
                fat_value = scale_value(food_option.fat, scale)
            else:
                food_name = choice.custom_food_name
                calories_value = (
                    round(choice.custom_calories, 1) if choice.custom_calories is not None else None
                )
                protein_value = (
                    round(choice.custom_protein, 1) if choice.custom_protein is not None else None
                )
                carbs_value = (
                    round(choice.custom_carbs, 1) if choice.custom_carbs is not None else None
                )
                fat_value = (
                    round(choice.custom_fat, 1) if choice.custom_fat is not None else None
                )

            choice_payload = MealHistoryChoiceResponse(
                choice_id=choice.id,
                food_option_id=choice.food_option_id,
                meal_slot_id=associated_slot.id if associated_slot else None,
                macro_type=macro_type_value,
                food_name=food_name,
                food_name_hebrew=food_name_hebrew,
                quantity=choice.quantity,
                is_custom=bool(choice.custom_food_name),
                calories=calories_value,
                protein=protein_value,
                carbs=carbs_value,
                fat=fat_value,
                is_approved=choice.is_approved,
                trainer_comment=choice.trainer_comment,
                photo_path=choice.photo_path,
            )

            meal_entry["choices"].append(choice_payload.dict())

        meals_list: List[Dict[str, Any]] = sorted(
            meals_map.values(), key=lambda meal: (meal["order_index"], meal["meal_name"])
        )

        for meal in meals_list:
            meal.pop("order_index", None)

        detailed_history.append(
            {
                "id": entry.id,
                "client_id": entry.client_id,
                "date": entry.date,
                "total_calories": entry.total_calories,
                "total_protein": entry.total_protein,
                "total_carbs": entry.total_carbs,
                "total_fat": entry.total_fat,
                "is_complete": entry.is_complete,
                "created_at": entry.created_at,
                "updated_at": entry.updated_at,
                "meals": meals_list,
            }
        )

    return detailed_history

@router.get("/history/average")
def get_average_calories(
    days: int = 7,
    client_id: int = None,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Calculate average calories per day over specified period"""
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    target_client_id = client_id if client_id else current_user.id
    
    # Permission check
    if current_user.role == UserRole.CLIENT and target_client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    # Get daily histories in date range
    histories = db.query(DailyMealHistory).filter(
        DailyMealHistory.client_id == target_client_id,
        DailyMealHistory.date >= start_date,
        DailyMealHistory.date <= end_date
    ).all()
    
    if not histories:
        return {
            "average_calories": 0,
            "total_days": 0,
            "period": f"Last {days} days"
        }
    
    total_calories = sum(h.total_calories for h in histories)
    average_calories = total_calories / len(histories)
    
    return {
        "average_calories": round(average_calories, 1),
        "total_days": len(histories),
        "period": f"Last {days} days",
        "detail_history": [
            {
                "date": h.date.isoformat(),
                "calories": h.total_calories,
                "is_complete": h.is_complete
            } for h in histories
        ]
    }

# ============ Meal Completion Endpoints ============


@router.get("/completions", response_model=List[MealCompletionStatusResponse])
def get_meal_completions(
    date: Optional[str] = None,
    client_id: Optional[int] = None,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch completion state for all meals on a specific date.
    Clients see their own data. Trainers/Admins can query their clients.
    """
    target_client_id = client_id if client_id is not None else current_user.id

    if current_user.role == UserRole.CLIENT and target_client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if current_user.role == UserRole.TRAINER:
        plan_exists = db.query(NewMealPlan).filter(
            NewMealPlan.client_id == target_client_id,
            NewMealPlan.trainer_id == current_user.id,
            NewMealPlan.is_active == True,
        ).first()
        if not plan_exists:
            raise HTTPException(status_code=403, detail="Not authorized")

    target_date = datetime.utcnow()
    if date:
        try:
            target_date = datetime.fromisoformat(date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format")

    normalized_date = _normalize_date(target_date)

    statuses = (
        db.query(MealCompletionStatus)
        .filter(
            MealCompletionStatus.client_id == target_client_id,
            MealCompletionStatus.date == normalized_date,
        )
        .all()
    )

    return statuses


@router.post("/completions", response_model=MealCompletionStatusResponse)
def upsert_meal_completion(
    completion_data: MealCompletionStatusCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create or update a completion state for a specific meal slot/date.
    """
    target_client_id = completion_data.client_id or current_user.id

    if current_user.role == UserRole.CLIENT and target_client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    slot = (
        db.query(MealSlot)
        .options(joinedload(MealSlot.meal_plan))
        .filter(MealSlot.id == completion_data.meal_slot_id)
        .first()
    )

    if not slot or not slot.meal_plan:
        raise HTTPException(status_code=404, detail="Meal slot not found")

    if slot.meal_plan.client_id != target_client_id:
        raise HTTPException(status_code=400, detail="Meal slot does not belong to target client")

    if current_user.role == UserRole.TRAINER and slot.meal_plan.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    normalized_date = _normalize_date(completion_data.date)

    existing_status = (
        db.query(MealCompletionStatus)
        .filter(
            MealCompletionStatus.client_id == target_client_id,
            MealCompletionStatus.meal_slot_id == completion_data.meal_slot_id,
            MealCompletionStatus.date == normalized_date,
        )
        .first()
    )

    completed_at = datetime.utcnow() if completion_data.is_completed else None

    if existing_status:
        existing_status.is_completed = completion_data.is_completed
        existing_status.completion_method = completion_data.completion_method
        existing_status.completed_at = completed_at
        db.commit()
        db.refresh(existing_status)
        return existing_status

    new_status = MealCompletionStatus(
        client_id=target_client_id,
        meal_slot_id=completion_data.meal_slot_id,
        date=normalized_date,
        is_completed=completion_data.is_completed,
        completion_method=completion_data.completion_method,
        completed_at=completed_at,
    )
    db.add(new_status)
    db.commit()
    db.refresh(new_status)
    return new_status

# ============ Meal Bank Endpoints ============

@router.post("/meal-bank", response_model=MealBankResponse, status_code=status.HTTP_201_CREATED)
def create_meal_bank_item(
    item_data: MealBankCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new meal bank item (trainer only)"""
    if current_user.role != UserRole.TRAINER and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can create meal bank items"
        )
    
    english_name = item_data.name.strip()
    hebrew_name = item_data.name_hebrew.strip() if item_data.name_hebrew else ""

    if not english_name and not hebrew_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one of name or name_hebrew must be provided"
        )

    meal_bank_item = MealBank(
        name=english_name or hebrew_name,
        name_hebrew=hebrew_name or None,
        macro_type=item_data.macro_type,
        calories=item_data.calories,
        protein=item_data.protein,
        carbs=item_data.carbs,
        fat=item_data.fat,
        created_by=current_user.id,
        is_public=item_data.is_public
    )
    
    db.add(meal_bank_item)
    db.commit()
    db.refresh(meal_bank_item)
    
    return meal_bank_item

@router.get("/meal-bank", response_model=List[MealBankResponse])
def get_meal_bank_items(
    trainer_id: int = None,
    macro_type: MacroType = None,
    search: str = None,
    include_public: bool = True,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get meal bank items (trainers see their own + public items)"""
    query = db.query(MealBank)
    
    if current_user.role == UserRole.TRAINER:
        # Trainers see their own items and public items
        if include_public:
            query = query.filter(
                (MealBank.is_public == True) | (MealBank.created_by == current_user.id)
            )
        else:
            query = query.filter(MealBank.created_by == current_user.id)
    elif current_user.role == UserRole.ADMIN:
        # Admins see all
        pass
    else:
        # Clients only see public items
        query = query.filter(MealBank.is_public == True)
    
    if trainer_id:
        query = query.filter(MealBank.created_by == trainer_id)
    
    if macro_type:
        query = query.filter(MealBank.macro_type == macro_type)
    
    if search:
        query = query.filter(
            (MealBank.name.contains(search)) | 
            (MealBank.name_hebrew.contains(search) if MealBank.name_hebrew else False)
        )
    
    return query.order_by(MealBank.name).all()

@router.get("/meal-bank/{item_id}", response_model=MealBankResponse)
def get_meal_bank_item(
    item_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific meal bank item"""
    meal_bank_item = db.query(MealBank).filter(MealBank.id == item_id).first()
    
    if not meal_bank_item:
        raise HTTPException(status_code=404, detail="Meal bank item not found")
    
    # Check if user has permission to view
    if meal_bank_item.created_by != current_user.id and not meal_bank_item.is_public:
        if current_user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Not authorized to view this item")
    
    return meal_bank_item

@router.put("/meal-bank/{item_id}", response_model=MealBankResponse)
def update_meal_bank_item(
    item_id: int,
    item_data: MealBankUpdate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a meal bank item (trainer only, own items)"""
    if current_user.role != UserRole.TRAINER and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only trainers can update meal bank items")
    
    meal_bank_item = db.query(MealBank).filter(MealBank.id == item_id).first()
    
    if not meal_bank_item:
        raise HTTPException(status_code=404, detail="Meal bank item not found")
    
    if current_user.role == UserRole.TRAINER and meal_bank_item.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this item")
    
    # Update fields
    update_data = item_data.dict(exclude_unset=True)

    if "name" in update_data or "name_hebrew" in update_data:
        english_name = update_data.get("name", meal_bank_item.name or "")
        hebrew_name = update_data.get("name_hebrew", meal_bank_item.name_hebrew or "")

        english_name = english_name.strip() if english_name else ""
        hebrew_name = hebrew_name.strip() if hebrew_name else ""

        if not english_name and not hebrew_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one of name or name_hebrew must be provided"
            )

        meal_bank_item.name = english_name or hebrew_name
        meal_bank_item.name_hebrew = hebrew_name or None

        # Remove processed fields so they are not set again
        update_data.pop("name", None)
        update_data.pop("name_hebrew", None)

    for field, value in update_data.items():
        setattr(meal_bank_item, field, value)
    
    db.commit()
    db.refresh(meal_bank_item)
    
    return meal_bank_item

@router.delete("/meal-bank/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal_bank_item(
    item_id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a meal bank item (trainer only, own items)"""
    if current_user.role != UserRole.TRAINER and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only trainers can delete meal bank items")
    
    meal_bank_item = db.query(MealBank).filter(MealBank.id == item_id).first()
    
    if not meal_bank_item:
        raise HTTPException(status_code=404, detail="Meal bank item not found")
    
    if current_user.role == UserRole.TRAINER and meal_bank_item.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this item")
    
    db.delete(meal_bank_item)
    db.commit()
    
    return None

