import sys
sys.path.insert(0, '/app')

from app.database import SessionLocal
from app.services import user_service
from app.routers.auth import UserLoginInfo

db = SessionLocal()
try:
    users = user_service.get_users(db)
    print('Success! Found', len(users), 'users')
    
    # Try to serialize them
    result = []
    for user in users:
        print(f'\nProcessing user: {user.username}')
        print(f'  Role type: {type(user.role)}')
        print(f'  Role value: {user.role}')
        print(f'  Has value attr: {hasattr(user.role, "value")}')
        if hasattr(user.role, 'value'):
            print(f'  Role.value: {user.role.value}')
        
        try:
            user_info = UserLoginInfo(
                id=user.id,
                username=user.username,
                email=user.email,
                role=user.role.value if hasattr(user.role, 'value') else str(user.role),
                full_name=user.full_name
            )
            result.append(user_info)
            print(f'  [OK] Serialized successfully')
        except Exception as e:
            print(f'  [ERROR] Failed to serialize: {e}')
            import traceback
            traceback.print_exc()
    
    print(f'\n[SUCCESS] Serialized {len(result)}/{len(users)} users')
    
except Exception as e:
    print('ERROR:', e)
    import traceback
    traceback.print_exc()
finally:
    db.close()



