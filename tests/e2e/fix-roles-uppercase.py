import sqlite3

conn = sqlite3.connect('c:/Users/noamc/OneDrive/Desktop/Projects/Elior/data/elior_fitness.db')
cursor = conn.cursor()

# Update all roles back to UPPERCASE to match the SQLite enum constraint
cursor.execute('UPDATE users SET role = UPPER(role)')
conn.commit()
print(f'Updated {cursor.rowcount} users to UPPERCASE')

# Verify
cursor.execute('SELECT id, username, email, role FROM users')
print('\nUsers after update:')
for row in cursor.fetchall():
    print(row)

conn.close()
print('\n[SUCCESS] All roles fixed to UPPERCASE to match database enum!')



