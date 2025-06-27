import pytest
import os
import tempfile
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from fastapi import UploadFile
from io import BytesIO
from PIL import Image
import json

from app.main import app
from app.services.file_service import FileService
from app.services.websocket_service import WebSocketService, NotificationType

client = TestClient(app)

class TestFileService:
    """Test the FileService class functionality."""
    
    @pytest.fixture
    def file_service(self):
        """Create a FileService instance for testing."""
        return FileService(base_upload_path="test_uploads")
    
    @pytest.fixture
    def mock_image_file(self):
        """Create a mock image file for testing."""
        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        # Create UploadFile mock
        mock_file = Mock(spec=UploadFile)
        mock_file.filename = "test_image.jpg"
        mock_file.content_type = "image/jpeg"
        mock_file.read = Mock(return_value=img_bytes.getvalue())
        mock_file.file = Mock()
        mock_file.file.seek = Mock()
        
        return mock_file
    
    @pytest.fixture
    def mock_document_file(self):
        """Create a mock document file for testing."""
        doc_content = b"This is a test PDF document content"
        
        mock_file = Mock(spec=UploadFile)
        mock_file.filename = "test_document.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.read = Mock(return_value=doc_content)
        mock_file.file = Mock()
        mock_file.file.seek = Mock()
        
        return mock_file
    
    @pytest.mark.asyncio
    async def test_validate_image_file_success(self, file_service, mock_image_file):
        """Test successful image file validation."""
        with patch('magic.from_buffer', return_value='image/jpeg'), \
             patch('PIL.Image.open') as mock_image:
            
            mock_img = Mock()
            mock_img.verify = Mock()
            mock_image.return_value = mock_img
            
            is_valid, message = await file_service.validate_file(mock_image_file, "image")
            assert is_valid is True
            assert "validation successful" in message.lower()
    
    @pytest.mark.asyncio
    async def test_validate_image_file_size_limit(self, file_service):
        """Test image file size validation."""
        # Create oversized file
        large_content = b"x" * (file_service.MAX_IMAGE_SIZE + 1)
        
        mock_file = Mock(spec=UploadFile)
        mock_file.filename = "large_image.jpg"
        mock_file.content_type = "image/jpeg"
        mock_file.read = Mock(return_value=large_content)
        mock_file.file = Mock()
        mock_file.file.seek = Mock()
        
        is_valid, message = await file_service.validate_file(mock_file, "image")
        assert is_valid is False
        assert "exceeds maximum" in message.lower()
    
    @pytest.mark.asyncio
    async def test_validate_invalid_mime_type(self, file_service):
        """Test validation of invalid MIME type."""
        mock_file = Mock(spec=UploadFile)
        mock_file.filename = "test.txt"
        mock_file.content_type = "text/plain"
        mock_file.read = Mock(return_value=b"test content")
        mock_file.file = Mock()
        mock_file.file.seek = Mock()
        
        with patch('magic.from_buffer', return_value='text/plain'):
            is_valid, message = await file_service.validate_file(mock_file, "image")
            assert is_valid is False
            assert "invalid image type" in message.lower()
    
    @pytest.mark.asyncio
    async def test_save_file_success(self, file_service, mock_image_file):
        """Test successful file saving."""
        with patch('magic.from_buffer', return_value='image/jpeg'), \
             patch('aiofiles.open'), \
             patch.object(file_service, '_process_image') as mock_process:
            
            mock_process.return_value = {
                "thumbnail_path": "test_thumb.jpg",
                "medium_path": "test_medium.jpg",
                "large_path": None
            }
            
            result = await file_service.save_file(
                file=mock_image_file,
                category="meal_photo",
                entity_id=123,
                process_image=True
            )
            
            assert "original_path" in result
            assert "filename" in result
            assert "meal_photo_123_" in result["filename"]
            assert result["thumbnail_path"] == "test_thumb.jpg"
    
    @pytest.mark.asyncio
    async def test_cleanup_orphaned_files(self, file_service):
        """Test cleanup of orphaned files."""
        with patch('os.path.exists', return_value=True), \
             patch('os.listdir', return_value=['old_file.jpg', 'new_file.jpg']), \
             patch('os.path.isfile', return_value=True), \
             patch('datetime.datetime.fromtimestamp') as mock_timestamp, \
             patch('os.remove') as mock_remove:
            
            from datetime import datetime, timedelta
            
            # Mock old and new file timestamps
            old_time = datetime.utcnow() - timedelta(hours=48)
            new_time = datetime.utcnow() - timedelta(hours=1)
            
            mock_timestamp.side_effect = [old_time, new_time]
            
            deleted_count = await file_service.cleanup_orphaned_files(max_age_hours=24)
            
            assert deleted_count == 1
            mock_remove.assert_called_once()

class TestWebSocketService:
    """Test the WebSocketService functionality."""
    
    @pytest.fixture
    def websocket_service(self):
        """Create a WebSocketService instance for testing."""
        return WebSocketService()
    
    @pytest.mark.asyncio
    async def test_connect_user(self, websocket_service):
        """Test user connection to WebSocket."""
        mock_websocket = Mock()
        mock_websocket.accept = AsyncMock()
        user_id = 123
        
        with patch.object(websocket_service, 'send_personal_message', new_callable=AsyncMock):
            await websocket_service.connect(mock_websocket, user_id)
            
            assert user_id in websocket_service.active_connections
            assert mock_websocket in websocket_service.active_connections[user_id]
            mock_websocket.accept.assert_called_once()
    
    def test_disconnect_user(self, websocket_service):
        """Test user disconnection from WebSocket."""
        mock_websocket = Mock()
        user_id = 123
        
        # Setup connection first
        websocket_service.active_connections[user_id] = {mock_websocket}
        websocket_service.user_subscriptions[user_id] = set()
        
        # Disconnect
        websocket_service.disconnect(mock_websocket, user_id)
        
        assert user_id not in websocket_service.active_connections
    
    @pytest.mark.asyncio
    async def test_file_upload_notification(self, websocket_service):
        """Test file upload notification."""
        user_id = 123
        file_data = {
            "filename": "test.jpg",
            "file_size": 1024,
            "mime_type": "image/jpeg"
        }
        
        with patch.object(websocket_service, 'send_personal_message') as mock_send:
            await websocket_service.notify_file_upload(user_id, file_data, "meal_photo")
            
            mock_send.assert_called()
            call_args = mock_send.call_args[0]
            assert call_args[0] == user_id
            assert call_args[1]["type"] == NotificationType.FILE_UPLOADED
    
    @pytest.mark.asyncio
    async def test_meal_completion_notification(self, websocket_service):
        """Test meal completion notification."""
        client_id = 123
        trainer_id = 456
        meal_data = {"meal_id": 789, "status": "completed"}
        
        # Setup trainer-client relationship
        websocket_service.trainer_clients[trainer_id] = {client_id}
        
        with patch.object(websocket_service, 'send_personal_message') as mock_send, \
             patch.object(websocket_service, 'broadcast_to_trainers') as mock_broadcast:
            
            await websocket_service.notify_meal_completion(client_id, meal_data)
            
            mock_send.assert_called_with(client_id, {
                "type": NotificationType.MEAL_COMPLETED,
                "meal_data": meal_data,
                "client_id": client_id,
                "timestamp": mock_send.call_args[0][1]["timestamp"]
            })
            mock_broadcast.assert_called_once()

class TestFileEndpoints:
    """Test file management API endpoints."""
    
    @pytest.fixture
    def auth_headers(self):
        """Create authentication headers for testing."""
        # This would typically use a real JWT token
        return {"Authorization": "Bearer test_token"}
    
    def test_media_stats_endpoint(self, auth_headers):
        """Test media statistics endpoint."""
        # Create a mock dependency override
        def mock_get_current_user():
            return Mock(id=1, role="trainer")
        
        # Override the dependency
        from app.main import app
        from app.auth.utils import get_current_user
        app.dependency_overrides[get_current_user] = mock_get_current_user
        
        try:
            with patch('os.path.exists', return_value=True), \
                 patch('os.listdir', return_value=['file1.jpg', 'file2.jpg']), \
                 patch('os.path.isfile', return_value=True), \
                 patch('os.path.getsize', return_value=1024):
                
                response = client.get("/api/files/media/stats")
                
                assert response.status_code == 200
                data = response.json()
                assert "total_size_bytes" in data
                assert "file_counts" in data
        finally:
            # Clean up dependency override
            app.dependency_overrides.clear()
    
    def test_media_access_control(self, auth_headers):
        """Test media file access control."""
        # Create a mock dependency override
        def mock_get_current_user():
            return Mock(id=1, role="client")
        
        # Override the dependency
        from app.main import app
        from app.auth.utils import get_current_user
        app.dependency_overrides[get_current_user] = mock_get_current_user
        
        try:
            # Test accessing non-existent file
            response = client.get("/api/files/media/meal_photos/nonexistent.jpg")
            
            assert response.status_code == 404
        finally:
            # Clean up dependency override
            app.dependency_overrides.clear()

class TestNutritionFileIntegration:
    """Test nutrition router file upload integration."""
    
    @pytest.fixture
    def auth_headers(self):
        """Create authentication headers for testing."""
        return {"Authorization": "Bearer test_token"}
    
    def test_meal_photo_upload_integration(self, auth_headers):
        """Test meal photo upload with nutrition integration."""
        # Create a mock dependency override for authentication
        def mock_get_current_user():
            return Mock(id=1, role="client")
        
        # Override the authentication dependency
        from app.main import app
        from app.auth.utils import get_current_user
        app.dependency_overrides[get_current_user] = mock_get_current_user
        
        try:
            with patch('app.services.nutrition_service.NutritionService') as mock_nutrition_service_class, \
                 patch('app.services.file_service.FileService') as mock_file_service_class:
                
                # Setup service mocks
                mock_nutrition_service = Mock()
                mock_meal_completion = Mock()
                mock_meal_completion.client_id = 1
                mock_nutrition_service.get_meal_completion.return_value = mock_meal_completion
                mock_nutrition_service_class.return_value = mock_nutrition_service
                
                mock_file_service = Mock()
                mock_file_service.save_file = AsyncMock(return_value={
                    "filename": "meal_photo_123_uuid.jpg",
                    "file_size": 1024,
                    "mime_type": "image/jpeg",
                    "original_path": "uploads/meal_photos/meal_photo_123_uuid.jpg",
                    "thumbnail_path": "uploads/thumbnails/meal_photo_123_uuid_thumb.jpg"
                })
                mock_file_service_class.return_value = mock_file_service
                
                # Create test file
                test_image = Image.new('RGB', (100, 100), color='red')
                img_bytes = BytesIO()
                test_image.save(img_bytes, format='JPEG')
                img_bytes.seek(0)
                
                # Test upload
                response = client.post(
                    "/api/nutrition/meal-completions/123/photo",
                    files={"file": ("test.jpg", img_bytes, "image/jpeg")}
                )
                
                assert response.status_code == 200
                data = response.json()
                assert "file_info" in data
                assert "message" in data
        finally:
            # Clean up dependency overrides
            app.dependency_overrides.clear()
    
    def test_enhanced_photo_upload(self, auth_headers):
        """Test enhanced photo upload endpoint."""
        # Create a mock dependency override for authentication
        def mock_get_current_user():
            return Mock(id=1, role="client")
        
        # Override the authentication dependency
        from app.main import app
        from app.auth.utils import get_current_user
        app.dependency_overrides[get_current_user] = mock_get_current_user
        
        try:
            with patch('app.services.nutrition_service.NutritionService') as mock_nutrition_service_class, \
                 patch('app.services.file_service.FileService') as mock_file_service_class:
                
                # Setup service mocks
                mock_nutrition_service = Mock()
                mock_meal_completion = Mock()
                mock_meal_completion.client_id = 1
                mock_nutrition_service.get_meal_completion.return_value = mock_meal_completion
                mock_nutrition_service_class.return_value = mock_nutrition_service
                
                mock_file_service = Mock()
                mock_file_service.save_file = AsyncMock(return_value={
                    "filename": "meal_photo_123_uuid.jpg",
                    "file_size": 1024,
                    "mime_type": "image/jpeg",
                    "original_path": "uploads/meal_photos/meal_photo_123_uuid.jpg"
                })
                mock_file_service_class.return_value = mock_file_service
                
                # Create test file
                test_image = Image.new('RGB', (100, 100), color='red')
                img_bytes = BytesIO()
                test_image.save(img_bytes, format='JPEG')
                img_bytes.seek(0)
                
                # Test upload
                response = client.post(
                    "/api/nutrition/photos/upload?meal_completion_id=123",
                    files={"file": ("test.jpg", img_bytes, "image/jpeg")}
                )
                
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert "file_info" in data
        finally:
            # Clean up dependency overrides
            app.dependency_overrides.clear()

class TestWebSocketEndpoints:
    """Test WebSocket API endpoints."""
    
    def test_websocket_stats_endpoint(self):
        """Test WebSocket statistics endpoint."""
        response = client.get("/api/ws/ws/stats")
        
        assert response.status_code == 200
        data = response.json()
        assert "total_connections" in data
        assert "total_users" in data
    
    def test_test_notification_endpoint(self):
        """Test sending test notifications."""
        response = client.post(
            "/api/ws/ws/test-notification/123?notification_type=system&title=Test&message=Hello"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data

# Integration Tests
class TestSprintFiveIntegration:
    """Integration tests for Sprint 5 features."""
    
    def test_complete_file_upload_workflow(self):
        """Test complete file upload workflow from upload to access."""
        # This would test the full workflow:
        # 1. User uploads file
        # 2. File is processed and stored
        # 3. WebSocket notification is sent
        # 4. File can be accessed with proper permissions
        # 5. File can be deleted with proper permissions
        pass
    
    def test_real_time_notification_workflow(self):
        """Test real-time notification workflow."""
        # This would test:
        # 1. Client connects to WebSocket
        # 2. Client uploads meal photo
        # 3. Trainer receives real-time notification
        # 4. Both users can access the file
        pass
    
    def test_file_access_control_workflow(self):
        """Test file access control across different user roles."""
        # This would test:
        # 1. Client uploads meal photo
        # 2. Client can access their own photo
        # 3. Trainer can access client's photo
        # 4. Other clients cannot access the photo
        pass

if __name__ == "__main__":
    pytest.main([__file__]) 