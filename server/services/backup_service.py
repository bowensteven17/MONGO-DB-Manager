import os
import subprocess
import logging
import shutil
from pathlib import Path
from datetime import datetime
import json
from .mongo_service import mongo_service
from utils import validate_database_name, validate_connection_string, get_backup_filename, sanitize_filename, format_bytes

class BackupService:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.backup_dir = Path(os.getenv('BACKUP_DIRECTORY', './backups'))
        self.temp_dir = Path(os.getenv('TEMP_DIRECTORY', './temp'))
        self.max_backup_size = int(os.getenv('MAX_BACKUP_SIZE', 1073741824))  # 1GB default
        
        # Ensure directories exist
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
    
    def create_backup(self, connection_string, database_name, backup_name=None, options=None):
        """Create a backup of a MongoDB database using mongodump"""
        # Validate inputs
        is_valid, message = validate_connection_string(connection_string)
        if not is_valid:
            raise ValueError(message)
        
        is_valid, message = validate_database_name(database_name)
        if not is_valid:
            raise ValueError(message)
        
        try:
            # Generate backup filename
            backup_filename = get_backup_filename(database_name, backup_name)
            backup_filename = sanitize_filename(backup_filename)
            backup_path = self.backup_dir / backup_filename
            
            # Check if mongodump is available
            try:
                subprocess.run(['mongodump', '--version'], 
                             capture_output=True, check=True)
            except (subprocess.CalledProcessError, FileNotFoundError):
                # Fallback to Python-based backup
                return self._create_python_backup(connection_string, database_name, backup_path)
            
            # Prepare mongodump command
            cmd = [
                'mongodump',
                '--uri', connection_string,
                '--db', database_name,
                '--out', str(backup_path)
            ]
            
            # Add additional options if provided
            if options:
                if options.get('gzip'):
                    cmd.append('--gzip')
                if options.get('collection'):
                    cmd.extend(['--collection', options['collection']])
                if options.get('query'):
                    cmd.extend(['--query', options['query']])
            
            self.logger.info(f"Starting backup of database {database_name}")
            
            # Execute mongodump
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                raise Exception(f"mongodump failed: {result.stderr}")
            
            # Get backup size
            backup_size = self._get_directory_size(backup_path)
            
            # Create metadata file
            metadata = {
                'database': database_name,
                'backup_name': backup_name,
                'created_at': datetime.utcnow().isoformat(),
                'size': backup_size,
                'method': 'mongodump',
                'options': options or {}
            }
            
            metadata_file = backup_path / 'metadata.json'
            with open(metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            self.logger.info(f"Successfully created backup {backup_filename}")
            
            return {
                'success': True,
                'message': 'Backup created successfully',
                'backup': {
                    'name': backup_filename,
                    'path': str(backup_path),
                    'database': database_name,
                    'size': backup_size,
                    'created_at': metadata['created_at'],
                    'method': 'mongodump'
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to create backup: {e}")
            # Clean up partial backup
            if 'backup_path' in locals() and backup_path.exists():
                shutil.rmtree(backup_path, ignore_errors=True)
            raise
    
    def _create_python_backup(self, connection_string, database_name, backup_path):
        """Create backup using Python MongoDB driver (fallback method)"""
        self.logger.info(f"Using Python-based backup for database {database_name}")
        
        try:
            backup_path.mkdir(parents=True, exist_ok=True)
            db_backup_path = backup_path / database_name
            db_backup_path.mkdir(parents=True, exist_ok=True)
            
            with mongo_service.get_client(connection_string) as client:
                db = client[database_name]
                collection_names = db.list_collection_names()
                
                total_size = 0
                
                for collection_name in collection_names:
                    collection = db[collection_name]
                    collection_file = db_backup_path / f"{collection_name}.json"
                    
                    documents = list(collection.find())
                    
                    # Convert ObjectId to string for JSON serialization
                    for doc in documents:
                        if '_id' in doc:
                            doc['_id'] = str(doc['_id'])
                    
                    with open(collection_file, 'w') as f:
                        json.dump(documents, f, indent=2, default=str)
                    
                    total_size += collection_file.stat().st_size
                    self.logger.info(f"Backed up collection {collection_name} ({len(documents)} documents)")
                
                # Create metadata
                metadata = {
                    'database': database_name,
                    'created_at': datetime.utcnow().isoformat(),
                    'size': total_size,
                    'method': 'python',
                    'collections': len(collection_names)
                }
                
                metadata_file = backup_path / 'metadata.json'
                with open(metadata_file, 'w') as f:
                    json.dump(metadata, f, indent=2)
                
                return {
                    'success': True,
                    'message': 'Backup created successfully (Python method)',
                    'backup': {
                        'name': backup_path.name,
                        'path': str(backup_path),
                        'database': database_name,
                        'size': total_size,
                        'created_at': metadata['created_at'],
                        'method': 'python'
                    }
                }
                
        except Exception as e:
            self.logger.error(f"Python backup failed: {e}")
            if backup_path.exists():
                shutil.rmtree(backup_path, ignore_errors=True)
            raise
    
    def restore_backup(self, connection_string, backup_name, target_database=None, options=None):
        """Restore a backup to MongoDB using mongorestore"""
        backup_path = self.backup_dir / backup_name
        
        if not backup_path.exists():
            raise FileNotFoundError(f"Backup '{backup_name}' not found")
        
        # Load metadata
        metadata_file = backup_path / 'metadata.json'
        metadata = {}
        if metadata_file.exists():
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
        
        original_database = metadata.get('database', 'unknown')
        target_db = target_database or original_database
        
        # Validate target database name
        is_valid, message = validate_database_name(target_db)
        if not is_valid:
            raise ValueError(message)
        
        try:
            backup_method = metadata.get('method', 'mongodump')
            
            if backup_method == 'python':
                return self._restore_python_backup(connection_string, backup_path, target_db, metadata)
            else:
                return self._restore_mongodump_backup(connection_string, backup_path, target_db, metadata, options)
                
        except Exception as e:
            self.logger.error(f"Failed to restore backup {backup_name}: {e}")
            raise
    
    def _restore_mongodump_backup(self, connection_string, backup_path, target_db, metadata, options):
        """Restore backup created with mongodump"""
        try:
            subprocess.run(['mongorestore', '--version'], 
                         capture_output=True, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            raise Exception("mongorestore is not available. Cannot restore mongodump backup.")
        
        # Find the database directory within the backup
        db_path = backup_path / metadata.get('database', target_db)
        if not db_path.exists():
            # Look for any subdirectory
            subdirs = [d for d in backup_path.iterdir() if d.is_dir()]
            if subdirs:
                db_path = subdirs[0]
            else:
                raise Exception("No database directory found in backup")
        
        cmd = [
            'mongorestore',
            '--uri', connection_string,
            '--db', target_db,
            str(db_path)
        ]
        
        # Add options
        if options:
            if options.get('drop'):
                cmd.append('--drop')
            if options.get('gzip'):
                cmd.append('--gzip')
        
        self.logger.info(f"Starting restore of backup to database {target_db}")
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            raise Exception(f"mongorestore failed: {result.stderr}")
        
        return {
            'success': True,
            'message': 'Backup restored successfully',
            'restore': {
                'source_backup': backup_path.name,
                'target_database': target_db,
                'original_database': metadata.get('database'),
                'method': 'mongorestore'
            }
        }
    
    def _restore_python_backup(self, connection_string, backup_path, target_db, metadata):
        """Restore backup created with Python method"""
        try:
            with mongo_service.get_client(connection_string) as client:
                db = client[target_db]
                
                # Find database directory
                original_db = metadata.get('database', target_db)
                db_backup_path = backup_path / original_db
                
                if not db_backup_path.exists():
                    raise Exception("Database backup directory not found")
                
                restored_collections = 0
                
                for json_file in db_backup_path.glob('*.json'):
                    collection_name = json_file.stem
                    
                    with open(json_file, 'r') as f:
                        documents = json.load(f)
                    
                    if documents:
                        collection = db[collection_name]
                        collection.insert_many(documents)
                        restored_collections += 1
                        self.logger.info(f"Restored collection {collection_name} ({len(documents)} documents)")
                
                return {
                    'success': True,
                    'message': 'Backup restored successfully',
                    'restore': {
                        'source_backup': backup_path.name,
                        'target_database': target_db,
                        'original_database': original_db,
                        'collections_restored': restored_collections,
                        'method': 'python'
                    }
                }
                
        except Exception as e:
            self.logger.error(f"Python restore failed: {e}")
            raise
    
    def list_backups(self):
        """List all available backups"""
        try:
            backups = []
            
            for backup_dir in self.backup_dir.iterdir():
                if backup_dir.is_dir():
                    metadata_file = backup_dir / 'metadata.json'
                    
                    if metadata_file.exists():
                        with open(metadata_file, 'r') as f:
                            metadata = json.load(f)
                    else:
                        # Create basic metadata for backups without metadata file
                        metadata = {
                            'database': 'unknown',
                            'created_at': datetime.fromtimestamp(backup_dir.stat().st_ctime).isoformat(),
                            'method': 'unknown'
                        }
                    
                    size = self._get_directory_size(backup_dir)
                    
                    backups.append({
                        'name': backup_dir.name,
                        'database': metadata.get('database'),
                        'size': size,
                        'size_formatted': format_bytes(size),
                        'created_at': metadata.get('created_at'),
                        'method': metadata.get('method', 'unknown')
                    })
            
            # Sort by creation date (newest first)
            backups.sort(key=lambda x: x['created_at'], reverse=True)
            
            return {
                'success': True,
                'backups': backups,
                'count': len(backups)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to list backups: {e}")
            raise
    
    def delete_backup(self, backup_name):
        """Delete a backup"""
        backup_path = self.backup_dir / backup_name
        
        if not backup_path.exists():
            raise FileNotFoundError(f"Backup '{backup_name}' not found")
        
        try:
            shutil.rmtree(backup_path)
            self.logger.info(f"Successfully deleted backup {backup_name}")
            
            return {
                'success': True,
                'message': f'Backup "{backup_name}" deleted successfully',
                'backup_name': backup_name
            }
            
        except Exception as e:
            self.logger.error(f"Failed to delete backup {backup_name}: {e}")
            raise
    
    def _get_directory_size(self, directory):
        """Get total size of directory in bytes"""
        total_size = 0
        for file_path in directory.rglob('*'):
            if file_path.is_file():
                total_size += file_path.stat().st_size
        return total_size

# Global instance
backup_service = BackupService()