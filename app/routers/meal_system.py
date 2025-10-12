"""
API endpoints for the new meal system
Trainers can create meal plans with 3 macros and food options
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.auth.utils import get_current_user
from app.schemas.auth import UserResponse
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
)
from app.models.meal_system import (
    MealPlanV2 as NewMealPlan,
    MealSlot,
    MacroCategory,
    FoodOption,
    ClientMealChoice,
    MacroType,
)

router = APIRouter()

# ============ Meal Plan Endpoints ============

@router.post("/plans", response_model=MealPlanResponse, status_code=status.HTTP_201_CREATED)
def create_meal_plan(
    plan_data: MealPlanCreate,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new meal plan (trainer only)"""
    if current_user.role != "TRAINER" and current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can create meal plans"
        )
    
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
    if current_user.role != "TRAINER" and current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only trainers can create meal plans"
        )
    
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
        fat_target=plan_data.fat_target
    )
    
    db.add(meal_plan)
    db.flush()  # Get meal_plan.id without committing
    
    # Create meal slots
    for slot_data in plan_data.meal_slots:
        meal_slot = MealSlot(
            meal_plan_id=meal_plan.id,
            name=slot_data.name,
            order_index=plan_data.meal_slots.index(slot_data),
            time_suggestion=slot_data.time_suggestion
        )
        db.add(meal_slot)
        db.flush()
        
        # Create macro categories (3: Protein, Carb, Fat)
        for macro_data in slot_data.macro_categories:
            macro_category = MacroCategory(
                meal_slot_id=meal_slot.id,
                macro_type=macro_data.macro_type,
                quantity_instruction=macro_data.quantity_instruction
            )
            db.add(macro_category)
            db.flush()
            
            # Create food options
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
    db.refresh(meal_plan)
    
    return meal_plan

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
    elif current_user.role == "TRAINER":
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
    if current_user.role == "CLIENT" and meal_plan.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this meal plan")
    elif current_user.role == "TRAINER" and meal_plan.trainer_id != current_user.id:
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
    if current_user.role != "TRAINER" and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only trainers can update meal plans")
    
    meal_plan = db.query(NewMealPlan).filter(NewMealPlan.id == plan_id).first()
    
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    if current_user.role == "TRAINER" and meal_plan.trainer_id != current_user.id:
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
    if current_user.role != "TRAINER" and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only trainers can delete meal plans")
    
    meal_plan = db.query(NewMealPlan).filter(NewMealPlan.id == plan_id).first()
    
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    if current_user.role == "TRAINER" and meal_plan.trainer_id != current_user.id:
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
    if current_user.role != "TRAINER" and current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only trainers can add meal slots")
    
    # Verify plan exists and trainer owns it
    meal_plan = db.query(NewMealPlan).filter(NewMealPlan.id == plan_id).first()
    if not meal_plan:
        raise HTTPException(status_code=404, detail="Meal plan not found")
    
    if current_user.role == "TRAINER" and meal_plan.trainer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    meal_slot = MealSlot(
        meal_plan_id=plan_id,
        name=slot_data.name,
        order_index=slot_data.order_index,
        time_suggestion=slot_data.time_suggestion,
        notes=slot_data.notes
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
    if current_user.role != "TRAINER" and current_user.role != "ADMIN":
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
    if current_user.role != "TRAINER" and current_user.role != "ADMIN":
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
    if current_user.role != "TRAINER" and current_user.role != "ADMIN":
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
    
    choice = ClientMealChoice(
        client_id=current_user.id,
        food_option_id=choice_data.food_option_id,
        meal_slot_id=choice_data.meal_slot_id,
        date=choice_data.date,
        quantity=choice_data.quantity,
        photo_path=choice_data.photo_path
    )
    
    db.add(choice)
    db.commit()
    db.refresh(choice)
    
    return choice

@router.get("/choices", response_model=List[ClientMealChoiceResponse])
def get_meal_choices(
    client_id: int = None,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get meal choices (trainers see their clients, clients see their own)"""
    query = db.query(ClientMealChoice)
    
    if current_user.role == "CLIENT":
        query = query.filter(ClientMealChoice.client_id == current_user.id)
    elif current_user.role == "TRAINER" and client_id:
        query = query.filter(ClientMealChoice.client_id == client_id)
    # Admins see all
    
    return query.all()

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
    if current_user.role == "CLIENT" and choice.client_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    for field, value in choice_data.dict(exclude_unset=True).items():
        setattr(choice, field, value)
    
    db.commit()
    db.refresh(choice)
    
    return choice

