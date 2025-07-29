from flask import Blueprint, request, jsonify, send_file
from services.backup_service import backup_service
from utils import require_json, validate_request_data, handle_error
import logging
import os
from pathlib import Path
from werkzeug.utils import secure_filename
import tempfile
import zipfile
from datetime import datetime
import shutil 
import json 
import zipfile
from pathlib import Path
from datetime import datetime

backup_bp = Blueprint('backup', __name__)
logger = logging.getLogger(__name__)

@backup_bp.route('/create', methods=['POST'])
@require_json()
@validate_request_data(['connection_string', 'database_name'])
def create_backup():
    """Create a backup of a MongoDB database"""
    try:
        data = request.get_json()
        connection_string = data['connection_string']
        database_name = data['database_name']
        backup_name = data.get('backup_name')  # Optional custom name
        options = data.get('options', {})  # Optional backup options
        backup_db_connection = data.get('backup_db_connection')  # Optional separate backup DB connection
        
        # Add backup DB connection to options if provided
        if backup_db_connection:
            options['backup_db_connection'] = backup_db_connection
        
        result = backup_service.create_backup(
            connection_string, database_name, backup_name, options
        )
        return jsonify(result), 201
        
    except Exception as e:
        return handle_error(e)

@backup_bp.route('/restore', methods=['POST'])
@require_json()
@validate_request_data(['connection_string', 'backup_name'])
def restore_backup():
    """Restore a backup to MongoDB with optional collection selection"""
    try:
        data = request.get_json()
        connection_string = data['connection_string']
        backup_name = data['backup_name']
        target_database = data.get('target_database')  # Optional, defaults to original database
        selected_collections = data.get('selected_collections')  # Optional list of collections to restore
        target_collections_filter = data.get('target_collections_filter')  # Optional list of target collections to overwrite
        options = data.get('options', {})  # Optional restore options
        restore_source = data.get('restore_source', 'file_system')  # New parameter
        
        # Additional confirmation required for restore operations
        confirm = data.get('confirm', False)
        if not confirm:
            return jsonify({
                'error': 'Confirmation required',
                'message': 'Set "confirm": true to proceed with backup restoration'
            }), 400
        
        result = backup_service.restore_backup(
            connection_string, backup_name, target_database, selected_collections, 
            target_collections_filter, options, restore_source
        )
        return jsonify(result), 200
        
    except Exception as e:
        return handle_error(e)

@backup_bp.route('/list', methods=['GET'])
def list_backups():
    """List all available backups"""
    try:
        result = backup_service.list_backups()
        return jsonify(result), 200
        
    except Exception as e:
        return handle_error(e)

@backup_bp.route('/delete', methods=['DELETE'])
@require_json()
@validate_request_data(['backup_name'])
def delete_backup():
    """Delete a backup"""
    try:
        data = request.get_json()
        backup_name = data['backup_name']
        
        # Additional confirmation required for deletion
        confirm = data.get('confirm', False)
        if not confirm:
            return jsonify({
                'error': 'Confirmation required',
                'message': 'Set "confirm": true to proceed with backup deletion'
            }), 400
        
        result = backup_service.delete_backup(backup_name)
        return jsonify(result), 200
        
    except Exception as e:
        return handle_error(e)

@backup_bp.route('/download/<backup_name>')
def download_backup(backup_name):
    """Download a backup file with enhanced error handling and logging"""
    try:
        logger.info(f"Download request for backup: {backup_name}")
        
        backup_dir = Path(os.getenv('BACKUP_DIRECTORY', './backups'))
        backup_path = backup_dir / backup_name
        
        logger.info(f"Looking for backup at path: {backup_path}")
        logger.info(f"Backup directory contents: {list(backup_dir.iterdir()) if backup_dir.exists() else 'Directory does not exist'}")
        
        if not backup_path.exists():
            logger.error(f"Backup not found at path: {backup_path}")
            return jsonify({
                'error': 'Backup not found',
                'message': f'Backup "{backup_name}" does not exist',
                'searched_path': str(backup_path),
                'available_backups': [item.name for item in backup_dir.iterdir() if item.is_dir()] if backup_dir.exists() else []
            }), 404
        
        if backup_path.is_dir():
            # For directory backups, create a ZIP file
            logger.info(f"Creating ZIP file for directory backup: {backup_name}")
            
            import zipfile
            temp_dir = Path(os.getenv('TEMP_DIRECTORY', './temp'))
            temp_dir.mkdir(parents=True, exist_ok=True)
            
            zip_filename = f"{backup_name}.zip"
            zip_path = temp_dir / zip_filename
            
            # Remove existing zip file if it exists
            if zip_path.exists():
                zip_path.unlink()
            
            try:
                with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    file_count = 0
                    for file_path in backup_path.rglob('*'):
                        if file_path.is_file():
                            arcname = file_path.relative_to(backup_path)
                            zipf.write(file_path, arcname)
                            file_count += 1
                    
                    logger.info(f"Created ZIP file with {file_count} files")
                
                # Verify ZIP file was created and has content
                if not zip_path.exists():
                    raise Exception("ZIP file was not created")
                
                zip_size = zip_path.stat().st_size
                if zip_size == 0:
                    raise Exception("ZIP file is empty")
                
                logger.info(f"ZIP file created successfully: {zip_path} (size: {zip_size} bytes)")
                
                return send_file(
                    zip_path,
                    as_attachment=True,
                    download_name=zip_filename,
                    mimetype='application/zip'
                )
                
            except Exception as zip_error:
                logger.error(f"Failed to create ZIP file: {zip_error}")
                if zip_path.exists():
                    zip_path.unlink()  # Clean up failed ZIP
                raise Exception(f"Failed to create downloadable ZIP: {zip_error}")
        
        else:
            # For single file backups
            logger.info(f"Serving single file backup: {backup_name}")
            
            file_size = backup_path.stat().st_size
            logger.info(f"File size: {file_size} bytes")
            
            return send_file(
                backup_path,
                as_attachment=True,
                download_name=backup_path.name
            )
        
    except Exception as e:
        error_msg = f"Failed to download backup {backup_name}: {str(e)}"
        logger.error(error_msg)
        return jsonify({
            'error': 'Download failed',
            'message': error_msg,
            'backup_name': backup_name
        }), 500

@backup_bp.route('/list-files')
def list_backup_files():
    """List all backup files in the backup directory for debugging"""
    try:
        backup_dir = Path(os.getenv('BACKUP_DIRECTORY', './backups'))
        
        if not backup_dir.exists():
            return jsonify({
                'success': False,
                'message': 'Backup directory does not exist',
                'path': str(backup_dir)
            })
        
        files = []
        for item in backup_dir.iterdir():
            if item.is_dir():
                # Get directory size
                size = sum(f.stat().st_size for f in item.rglob('*') if f.is_file())
                file_count = len([f for f in item.rglob('*') if f.is_file()])
                
                files.append({
                    'name': item.name,
                    'type': 'directory',
                    'size': size,
                    'file_count': file_count,
                    'created': item.stat().st_ctime
                })
            elif item.is_file():
                files.append({
                    'name': item.name,
                    'type': 'file',
                    'size': item.stat().st_size,
                    'created': item.stat().st_ctime
                })
        
        return jsonify({
            'success': True,
            'backup_directory': str(backup_dir),
            'files': files,
            'count': len(files)
        })
        
    except Exception as e:
        logger.error(f"Failed to list backup files: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@backup_bp.route('/info/<backup_name>')
def get_backup_info(backup_name):
    """Get information about a specific backup"""
    try:
        # First try file system backup
        backup_dir = Path(os.getenv('BACKUP_DIRECTORY', './backups'))
        backup_path = backup_dir / backup_name
        
        if backup_path.exists():
            # File system backup exists - use existing logic
            # Load metadata if available
            metadata_file = backup_path / 'metadata.json'
            metadata = {}
            
            if metadata_file.exists():
                import json
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
            
            # Get backup size
            def get_size(path):
                if path.is_file():
                    return path.stat().st_size
                else:
                    return sum(f.stat().st_size for f in path.rglob('*') if f.is_file())
            
            size = get_size(backup_path)
            
            from utils import format_bytes
            from datetime import datetime
            
            backup_info = {
                'name': backup_name,
                'database': metadata.get('database', 'unknown'),
                'size': size,
                'size_formatted': format_bytes(size),
                'created_at': metadata.get('created_at', 
                    datetime.fromtimestamp(backup_path.stat().st_ctime).isoformat()),
                'method': metadata.get('method', 'unknown'),
                'path': str(backup_path),
                'type': 'directory' if backup_path.is_dir() else 'file',
                'source': 'file_system'
            }
            
            # Add additional metadata if available
            if 'options' in metadata:
                backup_info['options'] = metadata['options']
            
            # Get collection information from backup directory
            collections_info = []
            if backup_path.is_dir():
                # Find the database directory within the backup
                db_name = metadata.get('database', 'unknown')
                db_backup_path = backup_path / db_name
                
                if db_backup_path.exists() and db_backup_path.is_dir():
                    # For mongodump backups - look for .bson files
                    for bson_file in db_backup_path.glob('*.bson'):
                        collection_name = bson_file.stem
                        collections_info.append({
                            'name': collection_name,
                            'size': bson_file.stat().st_size,
                            'type': 'bson'
                        })
                    
                    # For python backups - look for .json files
                    if not collections_info:
                        for json_file in db_backup_path.glob('*.json'):
                            collection_name = json_file.stem
                            collections_info.append({
                                'name': collection_name,
                                'size': json_file.stat().st_size,
                                'type': 'json'
                            })
            
            if collections_info:
                backup_info['collections'] = collections_info
            elif 'collections' in metadata:
                backup_info['collections'] = metadata['collections']
            
            return jsonify({
                'success': True,
                'backup': backup_info
            }), 200
        
        else:
            # File system backup not found, try database backup
            result = backup_service.get_database_backup_info(backup_name)
            return jsonify(result), 200
        
    except Exception as e:
        return handle_error(e)
        
        #get backed up database's from 'database'
@backup_bp.route('/list-database', methods=['GET'])
def list_database_backups():
    """List all backups stored in the backup database"""
    try:
        result = backup_service.list_database_backups()
        return jsonify(result), 200
        
    except Exception as e:
        return handle_error(e)



@backup_bp.route('/validate/<backup_name>')
def validate_backup():
    """Validate the integrity of a backup"""
    try:
        backup_name = request.view_args['backup_name']
        backup_dir = Path(os.getenv('BACKUP_DIRECTORY', './backups'))
        backup_path = backup_dir / backup_name
        
        if not backup_path.exists():
            return jsonify({
                'error': 'Backup not found',
                'message': f'Backup "{backup_name}" does not exist'
            }), 404
        
        validation_results = {
            'backup_name': backup_name,
            'exists': True,
            'readable': True,
            'has_metadata': False,
            'has_data': False,
            'valid': False,
            'issues': []
        }
        
        try:
            # Check if backup is readable
            if backup_path.is_dir():
                list(backup_path.iterdir())
            else:
                backup_path.stat()
        except Exception as e:
            validation_results['readable'] = False
            validation_results['issues'].append(f"Backup is not readable: {str(e)}")
        
        # Check for metadata file
        metadata_file = backup_path / 'metadata.json'
        if metadata_file.exists():
            validation_results['has_metadata'] = True
            try:
                import json
                with open(metadata_file, 'r') as f:
                    json.load(f)
            except Exception as e:
                validation_results['issues'].append(f"Invalid metadata file: {str(e)}")
        
        # Check for data files
        if backup_path.is_dir():
            data_files = list(backup_path.rglob('*.bson')) + list(backup_path.rglob('*.json'))
            if data_files:
                validation_results['has_data'] = True
            else:
                validation_results['issues'].append("No data files found in backup")
        else:
            validation_results['has_data'] = True  # Assume single file backups contain data
        
        # Overall validation
        validation_results['valid'] = (
            validation_results['readable'] and 
            validation_results['has_data'] and 
            len(validation_results['issues']) == 0
        )
        
        return jsonify({
            'success': True,
            'validation': validation_results
        }), 200
        
    except Exception as e:
        return handle_error(e)

#check for the number of dbs
@backup_bp.route('/backup-database/info', methods=['GET'])
def get_backup_database_info():
    """Get information about the backup database"""
    try:
        result = backup_service.get_backup_database_info()
        return jsonify(result), 200
        
    except Exception as e:
        return handle_error(e)

@backup_bp.route('/delete-database', methods=['DELETE'])
@require_json()
@validate_request_data(['backup_name'])
def delete_database_backup():
    """Delete a backup from database storage"""
    try:
        data = request.get_json()
        backup_name = data['backup_name']
        
        # Additional confirmation required for deletion
        confirm = data.get('confirm', False)
        if not confirm:
            return jsonify({
                'error': 'Confirmation required',
                'message': 'Set "confirm": true to proceed with backup deletion'
            }), 400
        
        result = backup_service.delete_database_backup(backup_name)
        return jsonify(result), 200
        
    except Exception as e:
        return handle_error(e)


@backup_bp.route('/upload', methods=['POST'])
def upload_backup():
    """Upload a backup file for restoration"""
    try:
        # Check if file is present in request
        if 'backup_file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided',
                'message': 'Please select a backup file to upload'
            }), 400
        
        file = request.files['backup_file']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected',
                'message': 'Please select a backup file to upload'
            }), 400
        
        # Validate file type
        if not (file.filename.lower().endswith('.zip') or 'backup' in file.filename.lower()):
            return jsonify({
                'success': False,
                'error': 'Invalid file type',
                'message': 'Please upload a ZIP backup file'
            }), 400
        
        # Secure the filename
        filename = secure_filename(file.filename)
        if not filename:
            filename = f"uploaded_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.zip"
        
        # Create uploads directory if it doesn't exist
        upload_dir = Path(os.getenv('UPLOAD_DIRECTORY', './uploads'))
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Save uploaded file
        file_path = upload_dir / filename
        file.save(str(file_path))
        
        logger.info(f"Uploaded backup file: {filename} ({file_path.stat().st_size} bytes)")
        
        # Extract ZIP file to backup directory for processing
        backup_dir = Path(os.getenv('BACKUP_DIRECTORY', './backups'))
        
        # Generate unique backup name
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        backup_name = f"uploaded_{filename.rsplit('.', 1)[0]}_{timestamp}"
        backup_path = backup_dir / backup_name
        
        try:
            # Extract ZIP file
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                zip_ref.extractall(backup_path)
            
            logger.info(f"Extracted backup to: {backup_path}")
            
            # Try to find and validate backup structure
            extracted_files = list(backup_path.rglob('*'))
            logger.info(f"Extracted {len(extracted_files)} files")
            
            # Look for metadata.json to get original database info
            metadata = {}
            metadata_file = None
            
            # Search for metadata.json in extracted files
            for file_path_extracted in backup_path.rglob('metadata.json'):
                try:
                    with open(file_path_extracted, 'r') as f:
                        metadata = json.load(f)
                    metadata_file = file_path_extracted
                    break
                except:
                    continue
            
            # If no metadata found, create basic metadata
            if not metadata:
                # Try to infer database name from directory structure
                db_dirs = [d for d in backup_path.iterdir() if d.is_dir()]
                database_name = 'unknown'
                
                if db_dirs:
                    # Look for common MongoDB backup structure
                    for db_dir in db_dirs:
                        bson_files = list(db_dir.glob('*.bson'))
                        if bson_files:
                            database_name = db_dir.name
                            break
                
                metadata = {
                    'database': database_name,
                    'created_at': datetime.utcnow().isoformat(),
                    'method': 'uploaded',
                    'original_filename': filename,
                    'upload_timestamp': timestamp
                }
                
                # Create metadata file
                metadata_file = backup_path / 'metadata.json'
                with open(metadata_file, 'w') as f:
                    json.dump(metadata, f, indent=2)
            
            # Clean up uploaded ZIP file
            file_path.unlink()
            
            return jsonify({
                'success': True,
                'message': 'Backup file uploaded and extracted successfully',
                'backup_name': backup_name,
                'original_filename': filename,
                'backup_info': {
                    'database': metadata.get('database', 'unknown'),
                    'method': metadata.get('method', 'uploaded'),
                    'size': sum(f.stat().st_size for f in backup_path.rglob('*') if f.is_file()),
                    'files_count': len([f for f in backup_path.rglob('*') if f.is_file()]),
                    'created_at': metadata.get('created_at'),
                    'upload_timestamp': timestamp
                }
            }), 200
            
        except zipfile.BadZipFile:
            # Clean up files on error
            if file_path.exists():
                file_path.unlink()
            if backup_path.exists():
                shutil.rmtree(backup_path, ignore_errors=True)
            
            return jsonify({
                'success': False,
                'error': 'Invalid ZIP file',
                'message': 'The uploaded file is not a valid ZIP archive'
            }), 400
            
        except Exception as extract_error:
            # Clean up files on error
            if file_path.exists():
                file_path.unlink()
            if backup_path.exists():
                shutil.rmtree(backup_path, ignore_errors=True)
            
            logger.error(f"Failed to extract backup: {extract_error}")
            return jsonify({
                'success': False,
                'error': 'Extraction failed',
                'message': f'Failed to extract backup file: {str(extract_error)}'
            }), 500
        
    except Exception as e:
        logger.error(f"Failed to upload backup: {e}")
        return handle_error(e)

@backup_bp.route('/list-uploaded', methods=['GET'])
def list_uploaded_backups():
    """List all uploaded backup files"""
    try:
        backup_dir = Path(os.getenv('BACKUP_DIRECTORY', './backups'))
        
        uploaded_backups = []
        
        for backup_path in backup_dir.iterdir():
            if backup_path.is_dir() and backup_path.name.startswith('uploaded_'):
                # Load metadata
                metadata_file = backup_path / 'metadata.json'
                metadata = {}
                
                if metadata_file.exists():
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                
                # Get backup size
                size = sum(f.stat().st_size for f in backup_path.rglob('*') if f.is_file())
                
                uploaded_backups.append({
                    'name': backup_path.name,
                    'database': metadata.get('database', 'unknown'),
                    'original_filename': metadata.get('original_filename', 'unknown'),
                    'upload_timestamp': metadata.get('upload_timestamp'),
                    'size': size,
                    'size_formatted': format_bytes(size),
                    'method': metadata.get('method', 'uploaded'),
                    'created_at': metadata.get('created_at')
                })
        
        # Sort by upload timestamp (newest first)
        uploaded_backups.sort(key=lambda x: x.get('upload_timestamp', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'backups': uploaded_backups,
            'count': len(uploaded_backups)
        }), 200
        
    except Exception as e:
        logger.error(f"Failed to list uploaded backups: {e}")
        return handle_error(e)