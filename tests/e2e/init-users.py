#!/usr/bin/env python3
"""
Initialize test users for E2E testing
Creates admin@elior.com, trainer@elior.com, client@elior.com
"""
import sys
sys.path.insert(0, 'c:\\Users\\noamc\\OneDrive\\Desktop\\Projects\\Elior')

from app.database import SessionLocal
from app.models.user import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_test_users():
    db = SessionLocal()
    
    try:
        # Check if test users already exist
        admin = db.query(User).filter(User.email == "admin@elior.com").first()
        trainer = db.query(User).filter(User.email == "trainer@elior.com").first()
        client = db.query(User).filter(User.email == "client@elior.com").first()
        
        # Create Admin
        if not admin:
            admin = User(
                username="admin@elior.com",
                email="admin@elior.com",
                hashed_password=pwd_context.hash("admin123"),
                full_name="Admin User",
                role="admin",
                is_active=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
            print(f"[OK] Created admin user: admin@elior.com / admin123 (ID: {admin.id})")
        else:
            print(f"[EXIST] Admin user already exists: admin@elior.com (ID: {admin.id})")
        
        # Create Trainer
        if not trainer:
            trainer = User(
                username="trainer@elior.com",
                email="trainer@elior.com",
                hashed_password=pwd_context.hash("trainer123"),
                full_name="Trainer User",
                role="trainer",
                is_active=True
            )
            db.add(trainer)
            db.commit()
            db.refresh(trainer)
            print(f"[OK] Created trainer user: trainer@elior.com / trainer123 (ID: {trainer.id})")
        else:
            print(f"[EXIST] Trainer user already exists: trainer@elior.com (ID: {trainer.id})")
        
        # Create Client
        if not client:
            client = User(
                username="client@elior.com",
                email="client@elior.com",
                hashed_password=pwd_context.hash("client123"),
                full_name="Client User",
                role="client",
                is_active=True,
                trainer_id=trainer.id if trainer else None
            )
            db.add(client)
            db.commit()
            db.refresh(client)
            print(f"[OK] Created client user: client@elior.com / client123 (ID: {client.id})")
        else:
            # Update client's trainer if needed
            if client.trainer_id != trainer.id:
                client.trainer_id = trainer.id
                db.commit()
            print(f"[EXIST] Client user already exists: client@elior.com (ID: {client.id}, Trainer: {client.trainer_id})")
        
        print("\n[SUCCESS] Test users initialized successfully!")
        print("\nTest Credentials:")
        print("=" * 50)
        print("Admin:   admin@elior.com    / admin123")
        print("Trainer: trainer@elior.com  / trainer123")
        print("Client:  client@elior.com   / client123")
        print("=" * 50)
        
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_users()

