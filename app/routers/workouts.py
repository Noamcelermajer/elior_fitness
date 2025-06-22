from fastapi import APIRouter

router = APIRouter()

@router.get("/test")
async def test_workouts():
    return {"message": "Workouts router working"} 