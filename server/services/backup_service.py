import os
import subprocess
import logging
import shutil
from pathlib import Path
from bson import ObjectId
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
        self.backup_db_connection = os.getenv('BACKUP_DB_CONNECTION_STRING', 'mongodb://localhost:27017')
        # Ensure directories exist
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
    
    def create_backup(self, connection_string, database_name, backup_name=None, options=None):
        """Create a backup of a MongoDB database using mongodump and/or database storage"""
        # Validate inputs
        is_valid, message = validate_connection_string(connection_string)
        if not is_valid:
            raise ValueError(message)
        
        is_valid, message = validate_database_name(database_name)
        if not is_valid:
            raise ValueError(message)
        
        try:
            # Generate backup filename/identifier
            backup_filename = get_backup_filename(database_name, backup_name)
            backup_filename = sanitize_filename(backup_filename)
            
            # Get destination options
            destinations = options.get('destinations', {}) if options else {}
            to_file_system = destinations.get('toFileSystem', True)  # Default to file system
            to_database = destinations.get('toDatabase', False)
            
            # Validate that at least one destination is selected
            if not to_file_system and not to_database:
                raise ValueError("At least one backup destination must be selected")
            
            results = {}
            
            # Create file system backup if requested
            if to_file_system:
                file_result = self._create_file_system_backup(
                    connection_string, database_name, backup_filename, options
                )
                results['file_system'] = file_result
            
            # Create database backup if requested
            if to_database:
                # Use custom backup DB connection if provided
                backup_db_conn = options.get('backup_db_connection') if options else None
                if not backup_db_conn:
                    backup_db_conn = self.backup_db_connection
                
                db_result = self._create_database_backup(
                    connection_string, database_name, backup_filename, backup_db_conn, options
                )
                results['database'] = db_result
            
            # Combine results
            combined_result = {
                'success': True,
                'message': 'Backup created successfully',
                'backup': {
                    'name': backup_filename,
                    'database': database_name,
                    'destinations': {
                        'file_system': to_file_system,
                        'database': to_database
                    },
                    'created_at': datetime.utcnow().isoformat()
                }
            }
            
            # Add specific results
            if 'file_system' in results:
                combined_result['backup']['file_system_path'] = str(results['file_system']['backup']['path'])  # Convert Path to string
                combined_result['backup']['size'] = results['file_system']['backup']['size']
            
            if 'database' in results:
                combined_result['backup']['database_backup'] = results['database']['backup']
            
            # Sanitize all Path objects for JSON serialization
            return self._sanitize_for_json(combined_result)
            
        except Exception as e:
            self.logger.error(f"Failed to create backup: {e}")
            raise
    def _sanitize_for_json(self, obj):
        """Recursively convert Path objects to strings for JSON serialization"""
        from pathlib import Path
        
        if isinstance(obj, Path):
            return str(obj)
        elif isinstance(obj, dict):
            return {key: self._sanitize_for_json(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._sanitize_for_json(item) for item in obj]
        else:
            return obj       
    def _create_file_system_backup(self, connection_string, database_name, backup_name=None, options=None):
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
                '--out', str(backup_path),
                '--excludeCollection', 'system.*'  # Exclude system collections
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
            
            result = {
                'success': True,
                'message': 'File system backup created successfully',
                'backup': {
                    'name': backup_path.name,
                    'path': str(backup_path),  # Make sure this is str(backup_path)
                    'database': database_name,
                    'size': backup_size,
                    'created_at': metadata['created_at'],
                    'method': 'mongodump'
                }
            }
            return self._sanitize_for_json(result)
                            
        except Exception as e:
            self.logger.error(f"Failed to create backup: {e}")
            # Clean up partial backup
            if 'backup_path' in locals() and backup_path.exists():
                shutil.rmtree(backup_path, ignore_errors=True)
            raise
    def _create_database_backup(self, connection_string, database_name, backup_identifier, backup_db_connection, options=None):
        """Create a backup stored in MongoDB database"""
        try:
            # Generate collection name: databasename_timestamp
            timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
            backup_collection_name = f"{database_name}_{timestamp}"
            
            self.logger.info(f"Starting database backup of {database_name} to collection {backup_collection_name}")
            
            # Connect to source database
            with mongo_service.get_client(connection_string) as source_client:
                source_db = source_client[database_name]
                collection_names = source_db.list_collection_names()
                
                # Connect to backup database
                with mongo_service.get_client(backup_db_connection) as backup_client:
                    backup_db = backup_client['backup_db']
                    backup_collection = backup_db[backup_collection_name]
                    
                    total_documents = 0
                    backup_metadata = {
                        'backup_identifier': backup_identifier,
                        'source_database': database_name,
                        'backup_timestamp': datetime.utcnow().isoformat(),
                        'backup_method': 'database_storage',
                        'source_connection': connection_string,
                        'backup_connection': backup_db_connection,
                        'collections_backed_up': [],
                        'total_documents': 0
                    }
                    
                    # Backup each collection (skip system collections)
                    for collection_name in collection_names:
                        # Skip system collections
                        if collection_name.startswith('system.'):
                            self.logger.info(f"Skipping system collection: {collection_name}")
                            continue
                        
                        source_collection = source_db[collection_name]
                        documents = list(source_collection.find())
                        
                        collection_doc_count = len(documents)
                        total_documents += collection_doc_count
                        
                        # Transform documents for backup storage
                        backup_documents = []
                        for doc in documents:
                            backup_doc = {
                                '_id': f"{collection_name}_{str(doc['_id'])}",  # Ensure unique IDs
                                'original_id': str(doc['_id']),
                                'original_collection': collection_name,
                                'backup_timestamp': backup_metadata['backup_timestamp'],
                                'source_database': database_name,
                                'data': doc
                            }
                            backup_documents.append(backup_doc)
                        
                        # Insert backup documents
                        if backup_documents:
                            backup_collection.insert_many(backup_documents)
                        
                        # Update metadata
                        backup_metadata['collections_backed_up'].append({
                            'name': collection_name,
                            'document_count': collection_doc_count
                        })
                        
                        self.logger.info(f"Backed up collection {collection_name} ({collection_doc_count} documents)")
                    
                    # Update total document count
                    backup_metadata['total_documents'] = total_documents
                    
                    # Store metadata as a special document in the backup collection
                    metadata_doc = {
                        '_id': 'BACKUP_METADATA',
                        'metadata': backup_metadata
                    }
                    backup_collection.insert_one(metadata_doc)
                    
                    self.logger.info(f"Successfully created database backup {backup_collection_name}")
                    
                    return {
                        'success': True,
                        'message': 'Database backup created successfully',
                        'backup': {
                            'collection_name': backup_collection_name,
                            'backup_database': 'backup_db',
                            'source_database': database_name,
                            'total_documents': total_documents,
                            'collections_count': len(collection_names),
                            'created_at': backup_metadata['backup_timestamp'],
                            'method': 'database_storage'
                        }
                    }
                    
        except Exception as e:
            self.logger.error(f"Failed to create database backup: {e}")
            # Cleanup partial backup if possible
            try:
                if 'backup_collection' in locals():
                    backup_collection.drop()
            except:
                pass
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
                
                # Backup each collection (skip system collections)
                for collection_name in collection_names:
                    # Skip system collections
                    if collection_name.startswith('system.'):
                        self.logger.info(f"Skipping system collection: {collection_name}")
                        continue
                    
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
                
                result = {
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
                return self._sanitize_for_json(result)
                
        except Exception as e:
            self.logger.error(f"Python backup failed: {e}")
            if backup_path.exists():
                shutil.rmtree(backup_path, ignore_errors=True)
            raise
    
    def restore_backup(self, connection_string, backup_name, target_database=None, selected_collections=None, target_collections_filter=None, options=None, restore_source='file_system'):
        """Restore a backup to MongoDB using mongorestore with optional collection selection and target filtering"""
        
        if restore_source == 'database':
            return self._restore_database_backup(connection_string, backup_name, target_database, selected_collections, target_collections_filter, options)
        else:
            return self._restore_file_system_backup(connection_string, backup_name, target_database, selected_collections, target_collections_filter, options)

    def _restore_file_system_backup(self, connection_string, backup_name, target_database=None, selected_collections=None, target_collections_filter=None, options=None):
        """Restore a backup from file system (existing logic)"""
        backup_path = self.backup_dir / backup_name
        
        if not backup_path.exists():
            raise FileNotFoundError(f"File system backup '{backup_name}' not found")
        
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
                return self._restore_python_backup(connection_string, backup_path, target_db, metadata, selected_collections, target_collections_filter)
            else:
                return self._restore_mongodump_backup(connection_string, backup_path, target_db, metadata, selected_collections, target_collections_filter, options)
                
        except Exception as e:
            self.logger.error(f"Failed to restore file system backup {backup_name}: {e}")
            raise
    def _restore_database_backup(self, connection_string, backup_name, target_database=None, selected_collections=None, target_collections_filter=None, options=None):
        """Restore a backup from database storage"""
        try:
            with mongo_service.get_client(self.backup_db_connection) as backup_client:
                backup_db = backup_client['backup_db']
                
                # Find the backup collection
                backup_collection = None
                backup_collection_name = None
                
                # First, try to find by exact collection name
                collection_names = backup_db.list_collection_names()
                if backup_name in collection_names:
                    backup_collection_name = backup_name
                    backup_collection = backup_db[backup_name]
                else:
                    # Search for backup by backup_identifier in metadata
                    for collection_name in collection_names:
                        if collection_name.startswith('system.'):
                            continue
                        
                        collection = backup_db[collection_name]
                        metadata_doc = collection.find_one({'_id': 'BACKUP_METADATA'})
                        
                        if metadata_doc is not None and 'metadata' in metadata_doc:
                            metadata = metadata_doc['metadata']
                            if metadata.get('backup_identifier') == backup_name:
                                backup_collection = collection
                                backup_collection_name = collection_name
                                break
                
                if backup_collection is None:
                    raise FileNotFoundError(f"Database backup '{backup_name}' not found")
                
                # Get metadata
                metadata_doc = backup_collection.find_one({'_id': 'BACKUP_METADATA'})
                if metadata_doc is None or 'metadata' not in metadata_doc:
                    raise Exception("Backup metadata not found")
                
                metadata = metadata_doc['metadata']
                original_database = metadata.get('source_database', 'unknown')
                target_db = target_database or original_database
                
                # Validate target database name
                is_valid, message = validate_database_name(target_db)
                if not is_valid:
                    raise ValueError(message)
                
                # Connect to target database
                with mongo_service.get_client(connection_string) as target_client:
                    target_db_obj = target_client[target_db]
                    
                    # Get all backup documents (excluding metadata)
                    backup_documents = list(backup_collection.find({'_id': {'$ne': 'BACKUP_METADATA'}}))
                    
                    # Group documents by original collection
                    collections_data = {}
                    for doc in backup_documents:
                        original_collection = doc.get('original_collection')
                        if original_collection is None:
                            continue
                        
                        if original_collection not in collections_data:
                            collections_data[original_collection] = []
                        
                        # Extract original document data
                        original_doc = doc.get('data', {})
                        # Restore original _id
                        if 'original_id' in doc:
                            try:
                                from bson import ObjectId
                                original_doc['_id'] = ObjectId(doc['original_id'])
                            except:
                                original_doc['_id'] = doc['original_id']
                        
                        collections_data[original_collection].append(original_doc)
                    
                    # Filter collections if specified
                    collections_to_restore = list(collections_data.keys())
                    if selected_collections is not None:
                        collections_to_restore = [col for col in collections_data.keys() if col in selected_collections]
                    
                    if target_collections_filter is not None:
                        collections_to_restore = [col for col in collections_to_restore if col in target_collections_filter]
                    
                    restored_collections = []
                    
                    # Restore each collection
                    for collection_name in collections_to_restore:
                        # Skip system collections for restore
                        if collection_name.startswith('system.'):
                            self.logger.info(f"Skipping system collection: {collection_name}")
                            continue
                        
                        if collection_name in collections_data:
                            documents = collections_data[collection_name]
                            
                            if len(documents) > 0:  # Use len() instead of just checking documents
                                try:
                                    target_collection = target_db_obj[collection_name]
                                    # Use delete_many instead of drop to safely clear existing data
                                    target_collection.delete_many({})
                                    target_collection.insert_many(documents)
                                    restored_collections.append(collection_name)
                                    self.logger.info(f"Restored collection {collection_name} ({len(documents)} documents)")
                                except Exception as e:
                                    self.logger.warning(f"Failed to restore collection {collection_name}: {e}")
                                    continue
                    
                    if len(restored_collections) == 0:
                        raise Exception("No collections were successfully restored")
                    
                    return {
                        'success': True,
                        'message': 'Database backup restored successfully',
                        'restore': {
                            'source_backup': backup_name,
                            'source_collection': backup_collection_name,
                            'target_database': target_db,
                            'original_database': original_database,
                            'collections_restored': restored_collections,
                            'method': 'database_restore'
                        }
                    }
                    
        except Exception as e:
            self.logger.error(f"Failed to restore database backup {backup_name}: {e}")
            raise
    def _restore_mongodump_backup(self, connection_string, backup_path, target_db, metadata, selected_collections=None, target_collections_filter=None, options=None):
        """Restore backup created with mongodump with optional collection selection and target filtering"""
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
        
        restored_collections = []
        
        if selected_collections:
            # Filter collections to restore based on target collections filter
            collections_to_restore = selected_collections
            if target_collections_filter:
                collections_to_restore = [col for col in selected_collections if col in target_collections_filter]
            
            # Restore only selected collections
            for collection_name in collections_to_restore:
                # Skip system collections for restore
                if collection_name.startswith('system.'):
                    self.logger.info(f"Skipping system collection: {collection_name}")
                    continue
                    
                collection_file = db_path / f"{collection_name}.bson"
                metadata_file = db_path / f"{collection_name}.metadata.json"
                
                if collection_file.exists():
                    cmd = [
                        'mongorestore',
                        '--uri', connection_string,
                        '--db', target_db,
                        '--collection', collection_name,
                        str(collection_file)
                    ]
                    
                    # Add options
                    if options:
                        if options.get('drop'):
                            cmd.append('--drop')
                        if options.get('gzip'):
                            cmd.append('--gzip')
                    
                    result = subprocess.run(cmd, capture_output=True, text=True)
                    
                    if result.returncode == 0:
                        restored_collections.append(collection_name)
                        self.logger.info(f"Restored collection: {collection_name}")
                    else:
                        self.logger.warning(f"Failed to restore collection {collection_name}: {result.stderr}")
                else:
                    self.logger.warning(f"Collection file not found: {collection_name}.bson")
            
            if not restored_collections:
                raise Exception("No collections were successfully restored")
        else:
            # Restore entire database
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
                'collections_restored': restored_collections if selected_collections else 'all',
                'method': 'mongorestore'
            }
        }


    def _restore_python_backup(self, connection_string, backup_path, target_db, metadata, selected_collections=None, target_collections_filter=None):
        """Restore backup created with Python method with optional collection selection and target filtering"""
        try:
            with mongo_service.get_client(connection_string) as client:
                db = client[target_db]
                
                # Find database directory
                original_db = metadata.get('database', target_db)
                db_backup_path = backup_path / original_db
                
                if not db_backup_path.exists():
                    raise Exception("Database backup directory not found")
                
                restored_collections = []
                
                if selected_collections:
                    # Filter collections to restore based on target collections filter
                    collections_to_restore = selected_collections
                    if target_collections_filter:
                        collections_to_restore = [col for col in selected_collections if col in target_collections_filter]
                    
                    # Restore only selected collections
                    for collection_name in collections_to_restore:
                        # Skip system collections for restore
                        if collection_name.startswith('system.'):
                            self.logger.info(f"Skipping system collection: {collection_name}")
                            continue
                            
                        json_file = db_backup_path / f"{collection_name}.json"
                        
                        if json_file.exists():
                            try:
                                with open(json_file, 'r') as f:
                                    documents = json.load(f)
                                
                                if documents:
                                    collection = db[collection_name]
                                    # Use delete_many instead of drop to safely clear existing data
                                    collection.delete_many({})
                                    collection.insert_many(documents)
                                    restored_collections.append(collection_name)
                                    self.logger.info(f"Restored collection {collection_name} ({len(documents)} documents)")
                            except Exception as e:
                                self.logger.warning(f"Failed to restore collection {collection_name}: {e}")
                                continue
                        else:
                            self.logger.warning(f"Collection file not found: {collection_name}.json")
                    
                    if not restored_collections:
                        raise Exception("No collections were successfully restored")
                else:
                    # Restore all collections
                    for json_file in db_backup_path.glob('*.json'):
                        collection_name = json_file.stem
                        
                        # Skip system collections for restore
                        if collection_name.startswith('system.'):
                            self.logger.info(f"Skipping system collection: {collection_name}")
                            continue
                        
                        try:
                            with open(json_file, 'r') as f:
                                documents = json.load(f)
                            
                            if documents:
                                collection = db[collection_name]
                                # Use delete_many instead of drop to safely clear existing data
                                collection.delete_many({})
                                collection.insert_many(documents)
                                restored_collections.append(collection_name)
                                self.logger.info(f"Restored collection {collection_name} ({len(documents)} documents)")
                        except Exception as e:
                            self.logger.warning(f"Failed to restore collection {collection_name}: {e}")
                            continue
                
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

    def list_database_backups(self):
        """List all backups stored in the backup database"""
        try:
            backups = []
            
            with mongo_service.get_client(self.backup_db_connection) as client:
                backup_db = client['backup_db']
                collection_names = backup_db.list_collection_names()
                
                for collection_name in collection_names:
                    # Skip system collections
                    if collection_name.startswith('system.'):
                        continue
                        
                    collection = backup_db[collection_name]
                    
                    # Get metadata document
                    metadata_doc = collection.find_one({'_id': 'BACKUP_METADATA'})
                    
                    if metadata_doc and 'metadata' in metadata_doc:
                        metadata = metadata_doc['metadata']
                        
                        # Get collection size (document count)
                        doc_count = collection.count_documents({'_id': {'$ne': 'BACKUP_METADATA'}})
                        
                        backups.append({
                            'name': metadata.get('backup_identifier', collection_name),
                            'database': metadata.get('source_database', 'unknown'),
                            'size': doc_count,  # Using document count as size
                            'size_formatted': f"{doc_count} documents",
                            'created_at': metadata.get('backup_timestamp'),
                            'method': 'database_storage',
                            'collection_name': collection_name,
                            'total_documents': metadata.get('total_documents', doc_count)
                        })
                    else:
                        # Handle collections without metadata (fallback)
                        doc_count = collection.count_documents({})
                        backups.append({
                            'name': collection_name,
                            'database': 'unknown',
                            'size': doc_count,
                            'size_formatted': f"{doc_count} documents",
                            'created_at': 'unknown',
                            'method': 'database_storage',
                            'collection_name': collection_name,
                            'total_documents': doc_count
                        })
            
            # Sort by creation date (newest first, with unknown dates last)
            def sort_key(backup):
                created_at = backup.get('created_at')
                if created_at and created_at != 'unknown':
                    try:
                        return datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    except:
                        return datetime.min
                return datetime.min
            
            backups.sort(key=sort_key, reverse=True)
            
            return {
                'success': True,
                'backups': backups,
                'count': len(backups)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to list database backups: {e}")
            raise

    def get_database_backup_info(self, backup_name):
        """Get information about a database backup"""
        try:
            with mongo_service.get_client(self.backup_db_connection) as client:
                backup_db = client['backup_db']
                
                # Find the backup collection
                backup_collection = None
                backup_collection_name = None
                
                # First, try to find by exact collection name
                collection_names = backup_db.list_collection_names()
                if backup_name in collection_names:
                    backup_collection_name = backup_name
                    backup_collection = backup_db[backup_name]
                else:
                    # Search for backup by backup_identifier in metadata
                    for collection_name in collection_names:
                        if collection_name.startswith('system.'):
                            continue
                        
                        collection = backup_db[collection_name]
                        metadata_doc = collection.find_one({'_id': 'BACKUP_METADATA'})
                        
                        if metadata_doc and 'metadata' in metadata_doc:
                            metadata = metadata_doc['metadata']
                            if metadata.get('backup_identifier') == backup_name:
                                backup_collection = collection
                                backup_collection_name = collection_name
                                break
                
                if backup_collection is None:
                    raise FileNotFoundError(f"Database backup '{backup_name}' not found")
                
                # Get metadata
                metadata_doc = backup_collection.find_one({'_id': 'BACKUP_METADATA'})
                if not metadata_doc or 'metadata' not in metadata_doc:
                    raise Exception("Backup metadata not found")
                
                metadata = metadata_doc['metadata']
                
                # Get collection information
                collections_info = []
                if 'collections_backed_up' in metadata:
                    collections_info = [
                        {
                            'name': col['name'],
                            'document_count': col['document_count'],
                            'type': 'database'
                        }
                        for col in metadata['collections_backed_up']
                    ]
                
                backup_info = {
                    'name': backup_name,
                    'database': metadata.get('source_database', 'unknown'),
                    'size': metadata.get('total_documents', 0),
                    'size_formatted': f"{metadata.get('total_documents', 0)} documents",
                    'created_at': metadata.get('backup_timestamp'),
                    'method': metadata.get('backup_method', 'database_storage'),
                    'collection_name': backup_collection_name,
                    'type': 'database',
                    'source': 'database',
                    'collections': collections_info
                }
                
                # Return dictionary, not jsonify
                return {
                    'success': True,
                    'backup': backup_info
                }
                
        except Exception as e:
            self.logger.error(f"Failed to get database backup info: {e}")
            raise
    #check for the number of dbs
    def get_backup_database_info(self):
        """Get information about the backup database and its collections"""
        try:
            with mongo_service.get_client(self.backup_db_connection) as client:
                # Get all databases
                db_list = client.list_database_names()
                
                # Focus on backup_db
                if 'backup_db' not in db_list:
                    return {
                        'success': True,
                        'backup_database_exists': False,
                        'connection_string': self.backup_db_connection,
                        'message': 'backup_db database does not exist yet'
                    }
                
                backup_db = client['backup_db']
                collection_names = backup_db.list_collection_names()
                
                # Get detailed info about each backup collection
                backup_collections = []
                total_documents = 0
                
                for collection_name in collection_names:
                    if collection_name.startswith('system.'):
                        continue
                    
                    collection = backup_db[collection_name]
                    doc_count = collection.count_documents({})
                    
                    # Try to get metadata
                    metadata_doc = collection.find_one({'_id': 'BACKUP_METADATA'})
                    metadata = {}
                    if metadata_doc and 'metadata' in metadata_doc:
                        metadata = metadata_doc['metadata']
                    
                    backup_collections.append({
                        'collection_name': collection_name,
                        'document_count': doc_count,
                        'source_database': metadata.get('source_database', 'unknown'),
                        'backup_timestamp': metadata.get('backup_timestamp', 'unknown'),
                        'backup_identifier': metadata.get('backup_identifier', collection_name),
                        'collections_backed_up': len(metadata.get('collections_backed_up', []))
                    })
                    
                    total_documents += doc_count
                
                return {
                    'success': True,
                    'backup_database_exists': True,
                    'connection_string': self.backup_db_connection,
                    'database_list': db_list,
                    'backup_db_info': {
                        'total_backup_collections': len(backup_collections),
                        'total_documents': total_documents,
                        'backup_collections': backup_collections
                    }
                }
                
        except Exception as e:
            self.logger.error(f"Failed to get backup database info: {e}")
            raise

    def delete_database_backup(self, backup_name):
        """Delete a backup from database storage"""
        try:
            with mongo_service.get_client(self.backup_db_connection) as client:
                backup_db = client['backup_db']
                
                # Find the backup collection
                backup_collection = None
                backup_collection_name = None
                
                # First, try to find by exact collection name
                collection_names = backup_db.list_collection_names()
                if backup_name in collection_names:
                    backup_collection_name = backup_name
                    backup_collection = backup_db[backup_name]
                else:
                    # Search for backup by backup_identifier in metadata
                    for collection_name in collection_names:
                        if collection_name.startswith('system.'):
                            continue
                        
                        collection = backup_db[collection_name]
                        metadata_doc = collection.find_one({'_id': 'BACKUP_METADATA'})
                        
                        if metadata_doc is not None and 'metadata' in metadata_doc:
                            metadata = metadata_doc['metadata']
                            if metadata.get('backup_identifier') == backup_name:
                                backup_collection = collection
                                backup_collection_name = collection_name
                                break
                
                if backup_collection is None:
                    raise FileNotFoundError(f"Database backup '{backup_name}' not found")
                
                # Delete the backup collection
                backup_collection.drop()
                
                self.logger.info(f"Successfully deleted database backup {backup_name} (collection: {backup_collection_name})")
                
                return {
                    'success': True,
                    'message': f'Database backup "{backup_name}" deleted successfully',
                    'backup_name': backup_name,
                    'collection_name': backup_collection_name,
                    'source': 'database'
                }
                
        except Exception as e:
            self.logger.error(f"Failed to delete database backup {backup_name}: {e}")
            raise
# Global instance
backup_service = BackupService()    