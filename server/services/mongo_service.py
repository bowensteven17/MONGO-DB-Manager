from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
import os
import logging
from contextlib import contextmanager

class MongoService:
    def __init__(self):
        self.timeout = int(os.getenv('MONGODB_TIMEOUT', 30000))
        self.logger = logging.getLogger(__name__)
    
    @contextmanager
    def get_client(self, connection_string):
        """Context manager for MongoDB client connections"""
        client = None
        try:
            client = MongoClient(
                connection_string,
                serverSelectionTimeoutMS=self.timeout,
                connectTimeoutMS=self.timeout,
                socketTimeoutMS=self.timeout
            )
            # Test the connection
            client.admin.command('ping')
            yield client
        except ConnectionFailure as e:
            self.logger.error(f"MongoDB connection failed: {e}")
            raise ConnectionFailure(f"Failed to connect to MongoDB: {str(e)}")
        except ServerSelectionTimeoutError as e:
            self.logger.error(f"MongoDB server selection timeout: {e}")
            raise ServerSelectionTimeoutError(f"MongoDB server selection timeout: {str(e)}")
        except Exception as e:
            self.logger.error(f"Unexpected error during MongoDB connection: {e}")
            raise
        finally:
            if client:
                client.close()
    
    def test_connection(self, connection_string):
        """Test MongoDB connection"""
        try:
            with self.get_client(connection_string) as client:
                # Get server info to verify connection
                server_info = client.server_info()
                self.logger.info(f"Successfully connected to MongoDB {server_info.get('version')}")
                return {
                    'success': True,
                    'message': 'Connection successful',
                    'server_info': {
                        'version': server_info.get('version'),
                        'maxBsonObjectSize': server_info.get('maxBsonObjectSize'),
                        'maxMessageSizeBytes': server_info.get('maxMessageSizeBytes')
                    }
                }
        except Exception as e:
            self.logger.error(f"Connection test failed: {e}")
            return {
                'success': False,
                'message': f'Connection failed: {str(e)}'
            }
    
    def get_databases(self, connection_string):
        """Get list of all databases"""
        try:
            with self.get_client(connection_string) as client:
                db_list = client.list_database_names()
                databases = []
                
                for db_name in db_list:
                    try:
                        db = client[db_name]
                        stats = db.command('dbStats')
                        databases.append({
                            'name': db_name,
                            'sizeOnDisk': stats.get('storageSize', 0),
                            'collections': stats.get('collections', 0),
                            'views': stats.get('views', 0),
                            'objects': stats.get('objects', 0),
                            'avgObjSize': stats.get('avgObjSize', 0),
                            'dataSize': stats.get('dataSize', 0),
                            'indexSize': stats.get('indexSize', 0)
                        })
                    except Exception as e:
                        # If we can't get stats, just include basic info
                        self.logger.warning(f"Could not get stats for database {db_name}: {e}")
                        databases.append({
                            'name': db_name,
                            'sizeOnDisk': 0,
                            'collections': 0,
                            'views': 0,
                            'objects': 0,
                            'avgObjSize': 0,
                            'dataSize': 0,
                            'indexSize': 0
                        })
                
                self.logger.info(f"Retrieved {len(databases)} databases")
                return databases
                
        except Exception as e:
            self.logger.error(f"Failed to get databases: {e}")
            raise
    
    def get_collections(self, connection_string, database_name):
        """Get list of collections in a database"""
        try:
            with self.get_client(connection_string) as client:
                db = client[database_name]
                
                # Get collection names and info
                collections = []
                collection_names = db.list_collection_names()
                
                for collection_name in collection_names:
                    # Skip system collections
                    if collection_name.startswith('system.'):
                        continue
                        
                    try:
                        collection = db[collection_name]
                        
                        # Get collection stats
                        stats = db.command('collStats', collection_name)
                        
                        # Get index information
                        indexes = list(collection.list_indexes())
                        index_info = []
                        for index in indexes:
                            index_info.append({
                                'name': index.get('name'),
                                'keys': index.get('key'),
                                'unique': index.get('unique', False),
                                'sparse': index.get('sparse', False)
                            })
                        
                        collections.append({
                            'name': collection_name,
                            'type': 'collection',
                            'count': stats.get('count', 0),
                            'size': stats.get('size', 0),
                            'storageSize': stats.get('storageSize', 0),
                            'avgObjSize': stats.get('avgObjSize', 0),
                            'indexCount': stats.get('nindexes', 0),
                            'totalIndexSize': stats.get('totalIndexSize', 0),
                            'indexes': index_info
                        })
                        
                    except Exception as e:
                        # If we can't get stats, include basic info
                        self.logger.warning(f"Could not get stats for collection {collection_name}: {e}")
                        collections.append({
                            'name': collection_name,
                            'type': 'collection',
                            'count': 0,
                            'size': 0,
                            'storageSize': 0,
                            'avgObjSize': 0,
                            'indexCount': 0,
                            'totalIndexSize': 0,
                            'indexes': []
                        })
                
                # Also get views
                try:
                    views = db.list_collection_names(filter={'type': 'view'})
                    for view_name in views:
                        collections.append({
                            'name': view_name,
                            'type': 'view',
                            'count': 0,
                            'size': 0,
                            'storageSize': 0,
                            'avgObjSize': 0,
                            'indexCount': 0,
                            'totalIndexSize': 0,
                            'indexes': []
                        })
                except Exception as e:
                    self.logger.warning(f"Could not get views for database {database_name}: {e}")
                
                self.logger.info(f"Retrieved {len(collections)} collections from database {database_name}")
                return collections
                
        except Exception as e:
            self.logger.error(f"Failed to get collections for database {database_name}: {e}")
            raise
    
    def get_database_info(self, connection_string, database_name):
        """Get detailed information about a specific database"""
        try:
            with self.get_client(connection_string) as client:
                db = client[database_name]
                
                # Get database stats
                stats = db.command('dbStats')
                
                # Get collection count (excluding system collections)
                all_collections = db.list_collection_names()
                collections = [c for c in all_collections if not c.startswith('system.')]
                
                return {
                    'name': database_name,
                    'collections': len(collections),
                    'views': stats.get('views', 0),
                    'objects': stats.get('objects', 0),
                    'avgObjSize': stats.get('avgObjSize', 0),
                    'dataSize': stats.get('dataSize', 0),
                    'storageSize': stats.get('storageSize', 0),
                    'indexSize': stats.get('indexSize', 0),
                    'fileSize': stats.get('fileSize', 0),
                    'nsSizeMB': stats.get('nsSizeMB', 0)
                }
                
        except Exception as e:
            self.logger.error(f"Failed to get database info for {database_name}: {e}")
            raise

# Global instance
mongo_service = MongoService()