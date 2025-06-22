from fastapi import APIRouter

router = APIRouter()

@router.get("/test")
async def test_nutrition():
    return {"message": "Nutrition router working"} 