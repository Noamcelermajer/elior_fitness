from fastapi import APIRouter

router = APIRouter()

@router.get("/test")
async def test_progress():
    return {"message": "Progress router working"} 