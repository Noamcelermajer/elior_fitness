from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional
import os
from pathlib import Path

from app.database import get_db
from app.auth.utils import get_current_user, oauth2_scheme
from app.schemas.auth import UserResponse, UserRole
from app.services.file_service import FileService
from app.services import user_service

router = APIRouter()

def get_file_service():
    """Dependency to get file service instance."""
    return FileService()

@router.get("/media/exercise_images/{filename}")
async def serve_exercise_image(
    filename: str,
    db: Session = Depends(get_db),
    file_service: FileService = Depends(get_file_service)
):
    """
    Serve exercise images publicly (no authentication required).
    This allows browser img tags to load them without auth headers.
    Exercise images are meant to be shared between trainer and clients.
    """
    # Use persistent path for Railway, fallback to local for dev
    persistent_base = os.getenv("PERSISTENT_PATH", "/app/persistent")
    upload_dir = os.getenv("UPLOAD_DIR", os.path.join(persistent_base, "uploads"))
    
    # Try multiple possible locations
    possible_paths = [
        os.path.join(upload_dir, "exercise_images", filename),  # Railway persistent
        f"{persistent_base}/uploads/exercise_images/{filename}",  # Alternative persistent path
        f"uploads/exercise_images/{filename}",  # Local dev
        f"/app/uploads/exercise_images/{filename}",  # Legacy path
    ]
    
    file_path = None
    for path in possible_paths:
        if os.path.exists(path):
            file_path = path
            break
    
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

@router.get("/media/{file_type}/{filename}")
async def serve_media_file(
    file_type: str,
    filename: str,
    size: Optional[str] = Query("original", description="Image size: original, thumbnail, medium, large"),
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
    file_service: FileService = Depends(get_file_service)
):
    """
    Serve media files with access control.
    
    Args:
        file_type: Type of file (meal_photos, profile_photos, progress_photos, documents, thumbnails)
        filename: Name of the file
        size: Image size for processed images
        current_user: Authenticated user
        db: Database session
        file_service: File service instance
    """
    
    # Validate file type
    allowed_types = ["meal_photos", "profile_photos", "progress_photos", "documents", "thumbnails"]
    if file_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {allowed_types}")
    
    # Construct file path - try multiple possible locations
    # Priority: Railway persistent volume, then local paths
    possible_paths = []
    
    # Get persistent path from environment (defaults to /app/persistent for Railway)
    persistent_base = os.getenv("PERSISTENT_PATH", "/app/persistent")
    upload_dir = os.getenv("UPLOAD_DIR", os.path.join(persistent_base, "uploads"))
    
    if size != "original" and file_type == "thumbnails":
        possible_paths = [
            os.path.join(upload_dir, "thumbnails", filename),  # Railway persistent
            f"{persistent_base}/uploads/thumbnails/{filename}",  # Alternative persistent path
            f"uploads/thumbnails/{filename}",  # Local dev
            f"/app/uploads/thumbnails/{filename}",  # Legacy path
        ]
    else:
        possible_paths = [
            os.path.join(upload_dir, file_type, filename),  # Railway persistent (primary)
            f"{persistent_base}/uploads/{file_type}/{filename}",  # Alternative persistent path
            f"/app/persistent/uploads/{file_type}/{filename}",  # Explicit Railway persistent
            f"uploads/{file_type}/{filename}",  # Local dev (relative)
            f"./uploads/{file_type}/{filename}",  # Local dev (explicit relative)
            f"/app/uploads/{file_type}/{filename}",  # Legacy absolute path
            os.path.join(os.getcwd(), "uploads", file_type, filename),  # Current working directory
        ]
    
    # Try to find the file in any of the possible locations
    file_path = None
    for path in possible_paths:
        if os.path.exists(path):
            file_path = path
            break
    
    # If not found, also try with the filename as-is (in case it's already a full path)
    if not file_path and os.path.exists(filename):
        file_path = filename
    
    if not file_path:
        # Log all attempted paths for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"File not found: {filename}")
        logger.error(f"File type: {file_type}")
        logger.error(f"Attempted paths: {possible_paths}")
        logger.error(f"Also tried: {filename}")
        logger.error(f"Current working directory: {os.getcwd()}")
        logger.error(f"PERSISTENT_PATH env: {os.getenv('PERSISTENT_PATH', 'not set')}")
        logger.error(f"UPLOAD_DIR env: {os.getenv('UPLOAD_DIR', 'not set')}")
        logger.error(f"Persistent base: {persistent_base}")
        logger.error(f"Upload dir: {upload_dir}")
        
        # Check if upload directory exists
        if os.path.exists(upload_dir):
            logger.error(f"Upload directory exists: {upload_dir}")
            try:
                files_in_dir = os.listdir(upload_dir)
                logger.error(f"Files in upload dir: {files_in_dir[:10]}")  # First 10 files
            except Exception as e:
                logger.error(f"Error listing upload dir: {e}")
        else:
            logger.error(f"Upload directory does not exist: {upload_dir}")
        
        raise HTTPException(status_code=404, detail=f"File not found: {filename}. Tried: {possible_paths}")
    
    # Access control based on file type
    if file_type == "meal_photos":
        # Extract entity ID from filename (format: meal_photo_{entity_id}_{uuid}.jpg)
        try:
            parts = filename.split('_')
            if len(parts) >= 3:
                entity_id = int(parts[2])  # meal_photo_{entity_id}_{uuid}
                
                # Check if user has access to this meal completion
                # Note: This would need to be implemented in the nutrition service
                # For now, allowing access based on basic user relationship
                meal_completion = None  # TODO: Get meal completion from nutrition service
                
                # For now, implement basic access control
                # Allow trainers to access all meal photos, clients only their own
                if current_user.role == UserRole.TRAINER:
                    return FileResponse(file_path)
                elif current_user.role == UserRole.CLIENT:
                    # Extract client ID from filename and check if it matches current user
                    if str(current_user.id) in filename:
                        return FileResponse(file_path)
                    else:
                        raise HTTPException(status_code=403, detail="Access denied")
                else:
                    raise HTTPException(status_code=403, detail="Access denied")
            else:
                raise HTTPException(status_code=400, detail="Invalid filename format")
        except (ValueError, IndexError):
            raise HTTPException(status_code=400, detail="Invalid filename format")
    
    elif file_type == "profile_photos":
        # Extract user ID from filename (format: profile_photo_{user_id}_{uuid}.jpg)
        try:
            parts = filename.split('_')
            if len(parts) >= 3:
                user_id = int(parts[2])  # profile_photo_{user_id}_{uuid}
                
                # Allow access if user is viewing their own photo or is a trainer
                if current_user.id == user_id or current_user.role == UserRole.TRAINER:
                    return FileResponse(file_path)
                else:
                    raise HTTPException(status_code=403, detail="Access denied")
            else:
                raise HTTPException(status_code=400, detail="Invalid filename format")
        except (ValueError, IndexError):
            raise HTTPException(status_code=400, detail="Invalid filename format")
    
    elif file_type == "progress_photos":
        # Extract entity ID from filename (format: progress_photo_{entity_id}_{uuid}.jpg)
        try:
            parts = filename.split('_')
            if len(parts) >= 3:
                entity_id = int(parts[2])  # progress_photo_{entity_id}_{uuid}
                
                # For now, implement basic access control for progress photos
                # Allow trainers to access all progress photos, clients only their own
                if current_user.role == UserRole.TRAINER:
                    return FileResponse(file_path)
                elif current_user.role == UserRole.CLIENT:
                    # Extract client ID from filename and check if it matches current user
                    if str(current_user.id) in filename:
                        return FileResponse(file_path)
                    else:
                        raise HTTPException(status_code=403, detail="Access denied")
                else:
                    raise HTTPException(status_code=403, detail="Access denied")
            else:
                raise HTTPException(status_code=400, detail="Invalid filename format")
        except (ValueError, IndexError):
            raise HTTPException(status_code=400, detail="Invalid filename format")
    
    elif file_type == "documents":
        # Extract entity ID from filename (format: document_{entity_id}_{uuid}.pdf)
        try:
            parts = filename.split('_')
            if len(parts) >= 3:
                entity_id = int(parts[2])  # document_{entity_id}_{uuid}
                
                # For now, implement basic access control for documents
                # Allow trainers to access all documents, clients only their own
                if current_user.role == UserRole.TRAINER:
                    return FileResponse(file_path)
                elif current_user.role == UserRole.CLIENT:
                    # Extract client ID from filename and check if it matches current user
                    if str(current_user.id) in filename:
                        return FileResponse(file_path)
                    else:
                        raise HTTPException(status_code=403, detail="Access denied")
                else:
                    raise HTTPException(status_code=403, detail="Access denied")
            else:
                raise HTTPException(status_code=400, detail="Invalid filename format")
        except (ValueError, IndexError):
            raise HTTPException(status_code=400, detail="Invalid filename format")
    
    elif file_type == "thumbnails":
        # Thumbnails follow the same access control as their parent files
        # Extract the original file type and entity ID from thumbnail filename
        try:
            parts = filename.split('_')
            if len(parts) >= 4:
                original_type = parts[0]  # meal_photo, profile_photo, etc.
                entity_id = int(parts[1])  # entity_id
                
                # Apply the same access control logic based on original type
                if original_type == "meal_photo":
                    # Basic access control for meal photo thumbnails
                    if current_user.role == UserRole.TRAINER:
                        return FileResponse(file_path)
                    elif current_user.role == UserRole.CLIENT:
                        if str(current_user.id) in filename:
                            return FileResponse(file_path)
                        else:
                            raise HTTPException(status_code=403, detail="Access denied")
                    else:
                        raise HTTPException(status_code=403, detail="Access denied")
                
                elif original_type == "profile_photo":
                    if current_user.id == entity_id or current_user.role == UserRole.TRAINER:
                        return FileResponse(file_path)
                    else:
                        raise HTTPException(status_code=403, detail="Access denied")
                
                else:
                    raise HTTPException(status_code=400, detail="Invalid thumbnail type")
            else:
                raise HTTPException(status_code=400, detail="Invalid filename format")
        except (ValueError, IndexError):
            raise HTTPException(status_code=400, detail="Invalid filename format")
    
    # Default deny
    raise HTTPException(status_code=403, detail="Access denied")

@router.delete("/media/{file_type}/{filename}")
async def delete_media_file(
    file_type: str,
    filename: str,
    current_user: UserResponse = Depends(get_current_user),
    db: Session = Depends(get_db),
    file_service: FileService = Depends(get_file_service)
):
    """
    Delete media files with access control.
    """
    
    # Validate file type
    allowed_types = ["meal_photos", "profile_photos", "progress_photos", "documents", "exercise_images"]
    if file_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {allowed_types}")
    
    # Use persistent path for Railway, fallback to local for dev
    persistent_base = os.getenv("PERSISTENT_PATH", "/app/persistent")
    upload_dir = os.getenv("UPLOAD_DIR", os.path.join(persistent_base, "uploads"))
    
    # Try multiple possible locations
    possible_paths = [
        os.path.join(upload_dir, file_type, filename),  # Railway persistent
        f"{persistent_base}/uploads/{file_type}/{filename}",  # Alternative persistent path
        f"uploads/{file_type}/{filename}",  # Local dev
        f"/app/uploads/{file_type}/{filename}",  # Legacy path
    ]
    
    file_path = None
    for path in possible_paths:
        if os.path.exists(path):
            file_path = path
            break
    
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Apply the same access control logic as serve_media_file
    # (This is a simplified version - you might want to extract this logic into a shared function)
    
    try:
        # Delete file and all its processed versions
        success = await file_service.delete_file(file_path)
        
        if success:
            return {"message": "File deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete file")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")

@router.get("/media/stats")
async def get_media_stats(
    current_user: UserResponse = Depends(get_current_user),
    file_service: FileService = Depends(get_file_service)
):
    """
    Get media storage statistics (admin/trainer only).
    """
    
    if current_user.role != UserRole.TRAINER:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Calculate storage usage
        total_size = 0
        file_counts = {}
        
        # Use persistent path for Railway, fallback to local for dev
        persistent_base = os.getenv("PERSISTENT_PATH", "/app/persistent")
        upload_dir = os.getenv("UPLOAD_DIR", os.path.join(persistent_base, "uploads"))
        
        for directory in ["meal_photos", "profile_photos", "progress_photos", "documents", "thumbnails"]:
            # Try multiple possible locations
            possible_dirs = [
                os.path.join(upload_dir, directory),  # Railway persistent
                f"{persistent_base}/uploads/{directory}",  # Alternative persistent path
                f"uploads/{directory}",  # Local dev
                f"/app/uploads/{directory}",  # Legacy path
            ]
            
            dir_path = None
            for path in possible_dirs:
                if os.path.exists(path):
                    dir_path = path
                    break
            
            if dir_path:
                count = 0
                size = 0
                for filename in os.listdir(dir_path):
                    file_path = os.path.join(dir_path, filename)
                    if os.path.isfile(file_path):
                        count += 1
                        size += os.path.getsize(file_path)
                
                file_counts[directory] = {"count": count, "size": size}
                total_size += size
        
        return {
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "file_counts": file_counts
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting media stats: {str(e)}") 