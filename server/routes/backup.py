from flask import Blueprint, request, jsonify, send_file
from services.backup_service import backup_service
from utils import require_json, validate_request_data, handle_error
import logging
import os
from pathlib import Path

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
    """Download a backup file"""
    try:
        backup_dir = Path(os.getenv('BACKUP_DIRECTORY', './backups'))
        backup_path = backup_dir / backup_name
        
        if not backup_path.exists():
            return jsonify({
                'error': 'Backup not found',
                'message': f'Backup "{backup_name}" does not exist'
            }), 404
        
        if backup_path.is_dir():
            # For directory backups, we need to create a zip file
            import zipfile
            import tempfile
            
            temp_dir = Path(os.getenv('TEMP_DIRECTORY', './temp'))
            zip_path = temp_dir / f"{backup_name}.zip"
            
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for file_path in backup_path.rglob('*'):
                    if file_path.is_file():
                        arcname = file_path.relative_to(backup_path)
                        zipf.write(file_path, arcname)
            
            return send_file(
                zip_path,
                as_attachment=True,
                download_name=f"{backup_name}.zip",
                mimetype='application/zip'
            )
        else:
            # For file backups
            return send_file(
                backup_path,
                as_attachment=True,
                download_name=backup_name
            )
        
    except Exception as e:
        logger.error(f"Failed to download backup {backup_name}: {e}")
        return handle_error(e)
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