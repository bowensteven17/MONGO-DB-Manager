import os
import logging
from pathlib import Path
from flask import jsonify
from pymongo.errors import PyMongoError, ConnectionFailure, ServerSelectionTimeoutError
import re
from datetime import datetime

def setup_logging():
    """Setup logging configuration"""
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    log_directory = os.getenv('LOG_DIRECTORY', './logs')
    
    # Create log directory if it doesn't exist
    Path(log_directory).mkdir(parents=True, exist_ok=True)
    
    # Configure logging
    logging.basicConfig(
        level=getattr(logging, log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(os.path.join(log_directory, 'app.log')),
            logging.StreamHandler()
        ]
    )

def create_directories():
    """Create required directories"""
    directories = [
        os.getenv('BACKUP_DIRECTORY', './backups'),
        os.getenv('TEMP_DIRECTORY', './temp'),
        os.getenv('LOG_DIRECTORY', './logs')
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
        logging.info(f"Ensured directory exists: {directory}")

def validate_connection_string(connection_string):
    """Validate MongoDB connection string format"""
    if not connection_string:
        return False, "Connection string is required"
    
    # Basic MongoDB URI pattern
    mongodb_pattern = r'^mongodb(\+srv)?:\/\/.+'
    if not re.match(mongodb_pattern, connection_string):
        return False, "Invalid MongoDB connection string format"
    
    return True, "Valid connection string"

def validate_database_name(db_name):
    """Validate database name"""
    if not db_name:
        return False, "Database name is required"
    
    # MongoDB database name restrictions
    invalid_chars = ['/', '\\', '.', '"', '*', '<', '>', ':', '|', '?']
    if any(char in db_name for char in invalid_chars):
        return False, f"Database name contains invalid characters: {invalid_chars}"
    
    if len(db_name) > 64:
        return False, "Database name must be 64 characters or less"
    
    return True, "Valid database name"

def validate_collection_name(collection_name):
    """Validate collection name"""
    if not collection_name:
        return False, "Collection name is required"
    
    # MongoDB collection name restrictions
    if collection_name.startswith('system.'):
        return False, "Collection name cannot start with 'system.'"
    
    if '$' in collection_name:
        return False, "Collection name cannot contain '$'"
    
    if len(collection_name) > 120:
        return False, "Collection name must be 120 characters or less"
    
    return True, "Valid collection name"

def handle_error(error):
    """Handle different types of errors and return appropriate response"""
    logging.error(f"Error occurred: {str(error)}")
    
    if isinstance(error, ConnectionFailure):
        return jsonify({
            'error': 'Connection Failed',
            'message': 'Could not connect to MongoDB. Please check your connection string and network.',
            'type': 'connection_error'
        }), 503
    
    elif isinstance(error, ServerSelectionTimeoutError):
        return jsonify({
            'error': 'Connection Timeout',
            'message': 'MongoDB server selection timed out. Please check if the server is running.',
            'type': 'timeout_error'
        }), 408
    
    elif isinstance(error, PyMongoError):
        return jsonify({
            'error': 'Database Error',
            'message': f'MongoDB operation failed: {str(error)}',
            'type': 'database_error'
        }), 400
    
    elif isinstance(error, ValueError):
        return jsonify({
            'error': 'Validation Error',
            'message': str(error),
            'type': 'validation_error'
        }), 400
    
    elif isinstance(error, FileNotFoundError):
        return jsonify({
            'error': 'File Not Found',
            'message': 'The requested file or backup was not found.',
            'type': 'file_error'
        }), 404
    
    elif isinstance(error, PermissionError):
        return jsonify({
            'error': 'Permission Error',
            'message': 'Insufficient permissions to perform this operation.',
            'type': 'permission_error'
        }), 403
    
    else:
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred.',
            'type': 'server_error'
        }), 500

def format_bytes(bytes_size):
    """Convert bytes to human readable format"""
    if bytes_size == 0:
        return "0 B"
    
    sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    i = 0
    while bytes_size >= 1024 and i < len(sizes) - 1:
        bytes_size /= 1024.0
        i += 1
    
    return f"{bytes_size:.2f} {sizes[i]}"

def get_backup_filename(db_name, backup_name=None):
    """Generate backup filename with timestamp"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    if backup_name:
        return f"{backup_name}_{timestamp}"
    return f"{db_name}_backup_{timestamp}"

def sanitize_filename(filename):
    """Sanitize filename for safe file operations"""
    # Remove invalid characters for filenames
    invalid_chars = ['<', '>', ':', '"', '|', '?', '*', '/', '\\']
    for char in invalid_chars:
        filename = filename.replace(char, '_')
    
    # Remove leading/trailing spaces and dots
    filename = filename.strip(' .')
    
    # Ensure filename is not too long
    if len(filename) > 255:
        filename = filename[:255]
    
    return filename

def require_json():
    """Decorator to ensure request has JSON content"""
    def decorator(f):
        def wrapper(*args, **kwargs):
            from flask import request
            if not request.is_json:
                return jsonify({'error': 'Content-Type must be application/json'}), 400
            return f(*args, **kwargs)
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator

def validate_request_data(required_fields):
    """Decorator to validate required fields in request data"""
    def decorator(f):
        def wrapper(*args, **kwargs):
            from flask import request
            data = request.get_json()
            
            if not data:
                return jsonify({'error': 'Request body is required'}), 400
            
            missing_fields = [field for field in required_fields if field not in data or not data[field]]
            if missing_fields:
                return jsonify({
                    'error': 'Missing required fields',
                    'missing_fields': missing_fields
                }), 400
            
            return f(*args, **kwargs)
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator