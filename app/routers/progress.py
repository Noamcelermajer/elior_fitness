from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import io
from datetime import datetime
from app.database import get_db
from app.auth.utils import get_current_user
from app.models.user import User
from app.services.progress_service import ProgressService
from app.schemas.progress import (
    SessionCompletionCreate, SessionCompletionResponse,
    ProgressRecordCreate, ProgressRecordResponse,
    ProgressReportFilter, ProgressReportData,
    ClientProgressSummary, CompletionStatusResponse,
    WorkoutPlanStatusResponse, ExportFormat
)

router = APIRouter()

def get_progress_service(db: Session = Depends(get_db)) -> ProgressService:
    return ProgressService(db)

# Session Completion Endpoints
@router.post("/sessions/complete", response_model=SessionCompletionResponse, status_code=status.HTTP_201_CREATED)
async def complete_session(
    completion_data: SessionCompletionCreate,
    current_user: User = Depends(get_current_user),
    progress_service: ProgressService = Depends(get_progress_service)
):
    """Mark a workout session as completed by the current client."""
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can complete workout sessions"
        )
    
    try:
        completion = progress_service.complete_session(completion_data, current_user.id)
        return completion
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/sessions/{session_id}/completion", response_model=SessionCompletionResponse)
async def get_session_completion(
    session_id: int,
    current_user: User = Depends(get_current_user),
    progress_service: ProgressService = Depends(get_progress_service)
):
    """Get session completion for a specific session."""
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can view their session completions"
        )
    
    completion = progress_service.get_session_completion(session_id, current_user.id)
    if not completion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session completion not found"
        )
    
    return completion

# Progress Record Endpoints
@router.post("/records", response_model=ProgressRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_progress_record(
    record_data: ProgressRecordCreate,
    current_user: User = Depends(get_current_user),
    progress_service: ProgressService = Depends(get_progress_service)
):
    """Create a new progress record for the current client."""
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can create progress records"
        )
    
    try:
        record = progress_service.create_progress_record(record_data, current_user.id)
        return record
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

# Progress Summary and Analytics Endpoints
@router.get("/summary", response_model=ClientProgressSummary)
async def get_progress_summary(
    current_user: User = Depends(get_current_user),
    progress_service: ProgressService = Depends(get_progress_service),
    client_id: Optional[int] = Query(None, description="Client ID (for trainers only)")
):
    """Get comprehensive progress summary for a client."""
    # Determine which client to get summary for
    target_client_id = current_user.id
    
    if current_user.role == "trainer" and client_id:
        # TODO: Add validation that the client belongs to this trainer
        target_client_id = client_id
    elif current_user.role == "client" and client_id and client_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Clients can only view their own progress"
        )
    
    try:
        summary = progress_service.get_client_progress_summary(target_client_id)
        return summary
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.get("/sessions/{session_id}/status", response_model=CompletionStatusResponse)
async def get_session_status(
    session_id: int,
    current_user: User = Depends(get_current_user),
    progress_service: ProgressService = Depends(get_progress_service)
):
    """Get completion status for a specific session."""
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can view session status"
        )
    
    try:
        status_response = progress_service.get_session_completion_status(session_id, current_user.id)
        return status_response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.get("/workout-plans/{workout_plan_id}/status", response_model=WorkoutPlanStatusResponse)
async def get_workout_plan_status(
    workout_plan_id: int,
    current_user: User = Depends(get_current_user),
    progress_service: ProgressService = Depends(get_progress_service)
):
    """Get completion status for an entire workout plan."""
    if current_user.role != "client":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can view workout plan status"
        )
    
    try:
        status_response = progress_service.get_workout_plan_completion_status(workout_plan_id, current_user.id)
        return status_response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

# Progress Report Endpoints
@router.post("/reports", response_model=ProgressReportData)
async def generate_progress_report(
    filter_params: ProgressReportFilter,
    current_user: User = Depends(get_current_user),
    progress_service: ProgressService = Depends(get_progress_service)
):
    """Generate a comprehensive progress report."""
    # Set client_id based on user role
    if current_user.role == "client":
        filter_params.client_id = current_user.id
    elif current_user.role == "trainer":
        if not filter_params.client_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Trainers must specify a client_id for reports"
            )
        # TODO: Add validation that the client belongs to this trainer
    
    try:
        report = progress_service.generate_progress_report(filter_params)
        return report
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/reports/export")
async def export_progress_report(
    filter_params: ProgressReportFilter,
    format: ExportFormat = Query(ExportFormat.JSON, description="Export format"),
    current_user: User = Depends(get_current_user),
    progress_service: ProgressService = Depends(get_progress_service)
):
    """Export a progress report in the specified format."""
    # Set client_id based on user role
    if current_user.role == "client":
        filter_params.client_id = current_user.id
    elif current_user.role == "trainer":
        if not filter_params.client_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Trainers must specify a client_id for reports"
            )
    
    try:
        # Generate the report
        report = progress_service.generate_progress_report(filter_params)
        
        # Export in the requested format
        exported_data = progress_service.export_progress_report(report, format)
        
        # Determine content type and filename
        if format == ExportFormat.JSON:
            content_type = "application/json"
            filename = f"progress_report_{report.summary.client_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        else:  # CSV
            content_type = "text/csv"
            filename = f"progress_report_{report.summary.client_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        
        # Return as streaming response
        return StreamingResponse(
            io.BytesIO(exported_data.encode()),
            media_type=content_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) 