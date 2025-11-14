import sys
sys.path.insert(0, '/app')

from app.database import SessionLocal
from app.services.user_service import get_users

db = SessionLocal()
try:
    users = get_users(db)
    print('Success! Found', len(users), 'users')
    for u in users:
        print(f'- {u.username}: {u.role} ({type(u.role)})')
except Exception as e:
    print('ERROR:', e)
    import traceback
    traceback.print_exc()
finally:
    db.close()


