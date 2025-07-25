from .mongo_service import mongo_service
import logging
from utils import validate_database_name, validate_collection_name, validate_connection_string
from pymongo.errors import CollectionInvalid

class CollectionService:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def list_collections(self, connection_string, database_name):
        """Get list of collections in a database"""
        # Validate inputs
        is_valid, message = validate_connection_string(connection_string)
        if not is_valid:
            raise ValueError(message)
        
        is_valid, message = validate_database_name(database_name)
        if not is_valid:
            raise ValueError(message)
        
        try:
            collections = mongo_service.get_collections(connection_string, database_name)
            
            self.logger.info(f"Successfully retrieved {len(collections)} collections from {database_name}")
            return {
                'success': True,
                'database': database_name,
                'collections': collections,
                'count': len(collections)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to list collections for database {database_name}: {e}")
            raise
    
    def get_collection_details(self, connection_string, database_name, collection_name):
        """Get detailed information about a specific collection"""
        # Validate inputs
        is_valid, message = validate_connection_string(connection_string)
        if not is_valid:
            raise ValueError(message)
        
        is_valid, message = validate_database_name(database_name)
        if not is_valid:
            raise ValueError(message)
        
        is_valid, message = validate_collection_name(collection_name)
        if not is_valid:
            raise ValueError(message)
        
        try:
            with mongo_service.get_client(connection_string) as client:
                db = client[database_name]
                collection = db[collection_name]
                
                # Get collection stats
                stats = db.command('collStats', collection_name)
                
                # Get indexes
                indexes = list(collection.list_indexes())
                
                # Get sample documents (first 5)
                sample_docs = list(collection.find().limit(5))
                
                # Convert ObjectId to string for JSON serialization
                for doc in sample_docs:
                    if '_id' in doc:
                        doc['_id'] = str(doc['_id'])
                
                result = {
                    'success': True,
                    'collection': {
                        'name': collection_name,
                        'database': database_name,
                        'stats': {
                            'count': stats.get('count', 0),
                            'size': stats.get('size', 0),
                            'storageSize': stats.get('storageSize', 0),
                            'avgObjSize': stats.get('avgObjSize', 0),
                            'indexCount': stats.get('nindexes', 0),
                            'totalIndexSize': stats.get('totalIndexSize', 0),
                            'capped': stats.get('capped', False),
                            'maxSize': stats.get('maxSize', 0) if stats.get('capped') else None
                        },
                        'indexes': [
                            {
                                'name': idx.get('name'),
                                'keys': idx.get('key'),
                                'unique': idx.get('unique', False),
                                'sparse': idx.get('sparse', False),
                                'background': idx.get('background', False),
                                'expireAfterSeconds': idx.get('expireAfterSeconds')
                            }
                            for idx in indexes
                        ],
                        'sampleDocuments': sample_docs
                    }
                }
                
                self.logger.info(f"Successfully retrieved details for collection {collection_name}")
                return result
                
        except Exception as e:
            self.logger.error(f"Failed to get collection details for {collection_name}: {e}")
            raise
    
    def copy_collection(self, connection_string, source_db, target_db, collection_name, new_collection_name=None):
        """Copy a collection from one database to another"""
        # Validate inputs
        is_valid, message = validate_connection_string(connection_string)
        if not is_valid:
            raise ValueError(message)
        
        for db_name in [source_db, target_db]:
            is_valid, message = validate_database_name(db_name)
            if not is_valid:
                raise ValueError(f"Invalid database name '{db_name}': {message}")
        
        is_valid, message = validate_collection_name(collection_name)
        if not is_valid:
            raise ValueError(message)
        
        target_collection_name = new_collection_name or collection_name
        is_valid, message = validate_collection_name(target_collection_name)
        if not is_valid:
            raise ValueError(f"Invalid target collection name: {message}")
        
        try:
            with mongo_service.get_client(connection_string) as client:
                source_collection = client[source_db][collection_name]
                target_collection = client[target_db][target_collection_name]
                
                # Check if source collection exists
                if collection_name not in client[source_db].list_collection_names():
                    raise ValueError(f"Source collection '{collection_name}' does not exist in database '{source_db}'")
                
                # Check if target collection already exists
                if target_collection_name in client[target_db].list_collection_names():
                    raise ValueError(f"Target collection '{target_collection_name}' already exists in database '{target_db}'")
                
                # Get total document count for progress tracking
                total_docs = source_collection.count_documents({})
                
                if total_docs == 0:
                    self.logger.info(f"Source collection {collection_name} is empty")
                    # Create empty collection with same indexes
                    target_collection.insert_one({'_temp': True})
                    target_collection.delete_one({'_temp': True})
                else:
                    # Copy documents in batches
                    batch_size = 1000
                    copied_docs = 0
                    
                    cursor = source_collection.find()
                    batch = []
                    
                    for document in cursor:
                        batch.append(document)
                        
                        if len(batch) >= batch_size:
                            target_collection.insert_many(batch)
                            copied_docs += len(batch)
                            batch = []
                            self.logger.info(f"Copied {copied_docs}/{total_docs} documents")
                    
                    # Insert remaining documents
                    if batch:
                        target_collection.insert_many(batch)
                        copied_docs += len(batch)
                
                # Copy indexes (except _id index)
                indexes = list(source_collection.list_indexes())
                copied_indexes = 0
                
                for index in indexes:
                    if index['name'] != '_id_':
                        try:
                            index_keys = index['key']
                            index_options = {k: v for k, v in index.items() if k not in ['key', 'v', 'ns']}
                            target_collection.create_index(list(index_keys.items()), **index_options)
                            copied_indexes += 1
                        except Exception as e:
                            self.logger.warning(f"Failed to copy index {index['name']}: {e}")
                
                result = {
                    'success': True,
                    'message': f'Collection copied successfully',
                    'source': {
                        'database': source_db,
                        'collection': collection_name
                    },
                    'target': {
                        'database': target_db,
                        'collection': target_collection_name
                    },
                    'statistics': {
                        'documentsTotal': total_docs,
                        'documentsCopied': copied_docs,
                        'indexesCopied': copied_indexes
                    }
                }
                
                self.logger.info(f"Successfully copied collection {collection_name} from {source_db} to {target_db}")
                return result
                
        except Exception as e:
            self.logger.error(f"Failed to copy collection {collection_name}: {e}")
            raise
    
    def drop_collections(self, connection_string, database_name, collection_names):
        """Drop multiple collections from a database"""
        # Validate inputs
        is_valid, message = validate_connection_string(connection_string)
        if not is_valid:
            raise ValueError(message)
        
        is_valid, message = validate_database_name(database_name)
        if not is_valid:
            raise ValueError(message)
        
        if not collection_names or not isinstance(collection_names, list):
            raise ValueError("Collection names must be provided as a list")
        
        # Validate collection names
        for collection_name in collection_names:
            is_valid, message = validate_collection_name(collection_name)
            if not is_valid:
                raise ValueError(f"Invalid collection name '{collection_name}': {message}")
        
        try:
            results = []
            
            with mongo_service.get_client(connection_string) as client:
                db = client[database_name]
                existing_collections = db.list_collection_names()
                
                for collection_name in collection_names:
                    try:
                        if collection_name not in existing_collections:
                            results.append({
                                'collection': collection_name,
                                'success': False,
                                'message': f"Collection '{collection_name}' does not exist"
                            })
                            continue
                        
                        # Drop the collection
                        db.drop_collection(collection_name)
                        
                        results.append({
                            'collection': collection_name,
                            'success': True,
                            'message': f"Collection '{collection_name}' dropped successfully"
                        })
                        
                        self.logger.info(f"Successfully dropped collection {collection_name}")
                        
                    except Exception as e:
                        results.append({
                            'collection': collection_name,
                            'success': False,
                            'message': f"Failed to drop collection: {str(e)}"
                        })
                        self.logger.error(f"Failed to drop collection {collection_name}: {e}")
            
            # Calculate summary
            successful = len([r for r in results if r['success']])
            failed = len([r for r in results if not r['success']])
            
            return {
                'success': True,
                'database': database_name,
                'results': results,
                'summary': {
                    'total': len(collection_names),
                    'successful': successful,
                    'failed': failed
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to drop collections: {e}")
            raise
    
    def create_collection(self, connection_string, database_name, collection_name, options=None):
        """Create a new collection"""
        # Validate inputs
        is_valid, message = validate_connection_string(connection_string)
        if not is_valid:
            raise ValueError(message)
        
        is_valid, message = validate_database_name(database_name)
        if not is_valid:
            raise ValueError(message)
        
        is_valid, message = validate_collection_name(collection_name)
        if not is_valid:
            raise ValueError(message)
        
        try:
            with mongo_service.get_client(connection_string) as client:
                db = client[database_name]
                
                # Check if collection already exists
                if collection_name in db.list_collection_names():
                    raise ValueError(f"Collection '{collection_name}' already exists")
                
                # Create collection with options
                if options:
                    db.create_collection(collection_name, **options)
                else:
                    db.create_collection(collection_name)
                
                self.logger.info(f"Successfully created collection {collection_name}")
                return {
                    'success': True,
                    'message': f'Collection "{collection_name}" created successfully',
                    'database': database_name,
                    'collection': collection_name
                }
                
        except Exception as e:
            self.logger.error(f"Failed to create collection {collection_name}: {e}")
            raise

# Global instance
collection_service = CollectionService()