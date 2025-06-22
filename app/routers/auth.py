from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Annotated

from app.database import get_db
from app.schemas.auth import UserCreate, UserResponse, Token, UserLogin
from app.services import auth_service, password_service
from app.auth.utils import get_current_user
from pydantic import BaseModel

router = APIRouter()

class PasswordResetRequest(BaseModel):
    email: str

class PasswordReset(BaseModel):
    token: str
    new_password: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user (trainer or client)
    """
    return await auth_service.create_user(db, user)

@router.post("/token", response_model=Token)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Session = Depends(get_db)
):
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = await auth_service.authenticate_user(
        db, form_data.username, form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth_service.create_access_token(data={"sub": str(user.id), "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login_json(user_data: UserLogin, db: Session = Depends(get_db)):
    """
    JSON compatible login, get an access token for future requests
    """
    user = await auth_service.authenticate_user(
        db, user_data.email, user_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth_service.create_access_token(data={"sub": str(user.id), "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: Annotated[UserResponse, Depends(get_current_user)]
):
    """
    Get current user information
    """
    return current_user

@router.post("/password-reset/request")
async def request_password_reset(
    reset_request: PasswordResetRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Request a password reset. Sends an email with a reset link if the email exists.
    """
    base_url = str(request.base_url)
    await password_service.request_password_reset(db, reset_request.email, base_url)
    return {"message": "If the email exists, a password reset link has been sent"}

@router.post("/password-reset/verify")
async def reset_password(
    reset_data: PasswordReset,
    db: Session = Depends(get_db)
):
    """
    Reset password using the reset token.
    """
    success = await password_service.reset_password(db, reset_data.token, reset_data.new_password)
    if success:
        return {"message": "Password has been reset successfully"}
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Failed to reset password"
    )

@router.post("/password/change")
async def change_password(
    password_data: PasswordChange,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change the current user's password.
    """
    success = await password_service.change_password(
        db,
        current_user.id,
        password_data.current_password,
        password_data.new_password
    )
    if success:
        return {"message": "Password changed successfully"}
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Failed to change password"
    ) 