#!/usr/bin/env python3
"""
Script to ensure admin user exists at startup
Directly uses database instead of API to avoid dependency on API being up
"""
import sys
import os
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.schemas.auth import UserRole
from app.auth.utils import get_password_hash

ADMIN_USER = {
    "username": "admin",
    "email": "admin@elior.com",
    "password": "2354wetr",
    "full_name": "Admin User",
    "role": UserRole.ADMIN
}

def ensure_admin_exists():
    """Create admin user directly in database if it doesn't exist"""
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(User).filter(
            (User.username == ADMIN_USER["username"]) | 
            (User.email == ADMIN_USER["email"])
        ).first()
        
        if admin:
            # Update password if needed
            if admin.role != UserRole.ADMIN:
                admin.role = UserRole.ADMIN
            admin.hashed_password = get_password_hash(ADMIN_USER["password"])
            db.commit()
            print("Admin user verified and password updated.")
            return True
        
        # Create new admin user
        admin = User(
            username=ADMIN_USER["username"],
            email=ADMIN_USER["email"],
            hashed_password=get_password_hash(ADMIN_USER["password"]),
            full_name=ADMIN_USER["full_name"],
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"Admin user created: username={ADMIN_USER['username']}, password={ADMIN_USER['password']}")
        return True
        
    except Exception as e:
        print(f"Error ensuring admin exists: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("=== ELIOR FITNESS ADMIN CHECK ===")
    
    if ensure_admin_exists():
        print("Admin setup completed successfully.")
        sys.exit(0)
    else:
        print("Failed to setup admin user.")
        sys.exit(1)

