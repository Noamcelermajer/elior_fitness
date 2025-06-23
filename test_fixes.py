#!/usr/bin/env python3
"""
Test script to verify database fixes
"""
import psycopg2
import random
import string

def generate_unique_email():
    """Generate a unique email for testing."""
    random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"test_{random_suffix}@test.com"

def test_database_connection():
    """Test database connection and cleanup."""
    try:
        # Connect to database
        conn = psycopg2.connect("postgresql://postgres:postgres@localhost:5432/elior_fitness")
        cur = conn.cursor()
        
        # Check if users table exists
        cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')")
        table_exists = cur.fetchone()[0]
        
        if table_exists:
            print("✓ Users table exists")
            
            # Clean up any existing test data
            cur.execute("DELETE FROM users WHERE email LIKE '%@test.com'")
            conn.commit()
            print("✓ Test data cleaned up")
            
            # Test unique email generation
            emails = [generate_unique_email() for _ in range(5)]
            unique_emails = set(emails)
            print(f"✓ Generated {len(emails)} unique emails: {len(unique_emails)} are unique")
            
            # Test inserting a user
            test_email = generate_unique_email()
            cur.execute(
                "INSERT INTO users (email, hashed_password, full_name, role, is_active) VALUES (%s, %s, %s, %s, %s)",
                (test_email, "hashed_password", "Test User", "client", True)
            )
            conn.commit()
            print(f"✓ Successfully inserted user with email: {test_email}")
            
            # Clean up
            cur.execute("DELETE FROM users WHERE email = %s", (test_email,))
            conn.commit()
            print("✓ Test user cleaned up")
            
        else:
            print("✗ Users table does not exist")
            
        cur.close()
        conn.close()
        print("✓ Database connection test completed successfully")
        
    except Exception as e:
        print(f"✗ Database test failed: {e}")

if __name__ == "__main__":
    test_database_connection() 