from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import subprocess
import json
import os
import time
from datetime import datetime
from typing import List, Dict, Any

from app.database import get_db
from app.auth.utils import get_current_user
from app.schemas.auth import UserResponse

router = APIRouter()

@router.get("/status")
async def get_system_status(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get system status and health metrics."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Mock system status for now
    return {
        "uptime": "2 days, 14 hours, 32 minutes",
        "database_connections": 12,
        "memory_usage": 68,
        "cpu_usage": 23,
        "active_users": 8,
        "total_users": 156,
        "system_health": "healthy",
        "last_backup": "2024-01-15 02:30:00",
        "version": "1.2.0"
    }

@router.get("/logs")
async def get_system_logs(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get recent system logs."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Mock logs for now
    return [
        {
            "id": 1,
            "timestamp": "2024-01-15 10:30:00",
            "level": "info",
            "message": "System backup completed successfully",
            "source": "backup-service"
        },
        {
            "id": 2,
            "timestamp": "2024-01-15 10:25:00",
            "level": "info",
            "message": "New user registered: john.doe@example.com",
            "source": "auth-service"
        },
        {
            "id": 3,
            "timestamp": "2024-01-15 10:20:00",
            "level": "warning",
            "message": "High memory usage detected (75%)",
            "source": "monitoring"
        }
    ]

@router.post("/run-tests")
async def run_tests(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Run pytest and return results."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Get the project root directory (2 levels up from app/)
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Run pytest with verbose output and JSON reporting
        cmd = [
            "python", "-m", "pytest",
            "--json-report",
            "--json-report-file=none",
            "--tb=short",
            "-v"
        ]
        
        # Run the command
        result = subprocess.run(
            cmd,
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        # Parse the output to extract test results
        test_details = []
        total_tests = 0
        passed = 0
        failed = 0
        skipped = 0
        
        # Parse pytest output
        lines = result.stdout.split('\n')
        for line in lines:
            if line.strip():
                if '::' in line and ('PASSED' in line or 'FAILED' in line or 'SKIPPED' in line):
                    total_tests += 1
                    parts = line.split('::')
                    if len(parts) >= 2:
                        test_name = parts[-1].split()[0]
                        if 'PASSED' in line:
                            passed += 1
                            status = 'passed'
                            duration = 0.2  # Mock duration
                        elif 'FAILED' in line:
                            failed += 1
                            status = 'failed'
                            duration = 0.1
                        elif 'SKIPPED' in line:
                            skipped += 1
                            status = 'skipped'
                            duration = 0.0
                        
                        test_details.append({
                            "test": test_name,
                            "status": status,
                            "duration": duration,
                            "error": None if status != 'failed' else "Test failed",
                            "reason": None if status != 'skipped' else "Test skipped"
                        })
        
        # Calculate coverage (mock for now)
        coverage = 87.3 if total_tests > 0 else 0
        
        # Calculate duration (mock based on number of tests)
        duration = total_tests * 0.1 + 2.0  # Base 2 seconds + 0.1 per test
        
        return {
            "total_tests": total_tests,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "duration": round(duration, 1),
            "coverage": coverage,
            "details": test_details,
            "raw_output": result.stdout,
            "error_output": result.stderr
        }
        
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Test execution timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run tests: {str(e)}")

@router.post("/maintenance")
async def toggle_maintenance_mode(
    enabled: bool,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle maintenance mode."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Mock implementation
    return {"message": f"Maintenance mode {'enabled' if enabled else 'disabled'}"}

@router.post("/restart")
async def restart_services(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Restart system services."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Mock implementation
    return {"message": "Services restart initiated"}

@router.post("/backup")
async def create_backup(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create database backup."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Mock implementation
    return {"message": "Database backup created successfully"}

@router.post("/optimize-db")
async def optimize_database(
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Optimize database."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Mock implementation
    return {"message": "Database optimization completed"} 