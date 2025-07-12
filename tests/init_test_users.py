#!/usr/bin/env python3
"""
Script to initialize the database with test users for frontend testing.
Run this script to create test users that can be used to test the login functionality.
"""

import sys
import os
from sqlalchemy.orm import Session

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

# Import all models to ensure they're registered
from app.database import engine, Base, get_db
from app.models import user, progress, nutrition, workout
from app.schemas.auth import UserRole
from app.services.password_service import get_password_hash

def create_test_users():
    """Create test users in the database"""
    
    # Create database tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Get database session
    db = next(get_db())
    
    try:
        # Check if test users already exist
        existing_admin = db.query(user.User).filter(user.User.username == "admin").first()
        existing_trainer = db.query(user.User).filter(user.User.username == "trainer").first()
        existing_client = db.query(user.User).filter(user.User.username == "client").first()
        
        if existing_admin:
            print("Admin user already exists")
        else:
            # Create admin user
            admin = user.User(
                username="admin",
                email="admin@test.com",
                hashed_password=get_password_hash("admin123"),
                full_name="Test Admin",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin)
            print("Created admin user: username=admin, password=admin123")
        
        if existing_trainer:
            print("Trainer user already exists")
        else:
            # Create trainer user
            trainer = user.User(
                username="trainer",
                email="trainer@test.com",
                hashed_password=get_password_hash("trainer123"),
                full_name="Test Trainer",
                role=UserRole.TRAINER,
                is_active=True
            )
            db.add(trainer)
            print("Created trainer user: username=trainer, password=trainer123")
        
        if existing_client:
            print("Client user already exists")
        else:
            # Create client user
            client = user.User(
                username="client",
                email="client@test.com",
                hashed_password=get_password_hash("client123"),
                full_name="Test Client",
                role=UserRole.CLIENT,
                is_active=True
            )
            db.add(client)
            print("Created client user: username=client, password=client123")
        
        # Commit changes
        db.commit()
        print("Test users initialized successfully!")
        
        # Display created users
        print("\nTest Users:")
        print("1. Admin   - username: admin, password: admin123")
        print("2. Trainer - username: trainer, password: trainer123")
        print("3. Client  - username: client, password: client123")
        
    except Exception as e:
        print(f"Error creating test users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Initializing test users...")
    create_test_users() 