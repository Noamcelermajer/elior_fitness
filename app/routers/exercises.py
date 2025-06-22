from fastapi import APIRouter

router = APIRouter()

@router.get("/test")
async def test_exercises():
    return {"message": "Exercises router working"} 