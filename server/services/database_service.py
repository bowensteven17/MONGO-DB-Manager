from .mongo_service import mongo_service
import logging
from utils import validate_database_name, validate_connection_string

class DatabaseService:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def test_connection(self, connection_string):
        """Test database connection"""
        # Validate connection string
        is_valid, message = validate_connection_string(connection_string)
        if not is_valid:
            raise ValueError(message)
        
        return mongo_service.test_connection(connection_string)
    
    def list_databases(self, connection_string):
        """Get list of all databases with their information"""
        # Validate connection string
        is_valid, message = validate_connection_string(connection_string)
        if not is_valid:
            raise ValueError(message)
        
        try:
            databases = mongo_service.get_databases(connection_string)
            
            # Sort databases by name
            databases.sort(key=lambda x: x['name'])
            
            self.logger.info(f"Successfully retrieved {len(databases)} databases")
            return {
                'success': True,
                'databases': databases,
                'count': len(databases)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to list databases: {e}")
            raise
    
    def get_database_details(self, connection_string, database_name):
        """Get detailed information about a specific database"""
        # Validate inputs
        is_valid, message = validate_connection_string(connection_string)
        if not is_valid:
            raise ValueError(message)
        
        is_valid, message = validate_database_name(database_name)
        if not is_valid:
            raise ValueError(message)
        
        try:
            # Get database info
            db_info = mongo_service.get_database_info(connection_string, database_name)
            
            # Get collections info
            collections = mongo_service.get_collections(connection_string, database_name)
            
            # Calculate totals
            total_documents = sum(col.get('count', 0) for col in collections if col['type'] == 'collection')
            total_data_size = sum(col.get('size', 0) for col in collections if col['type'] == 'collection')
            total_storage_size = sum(col.get('storageSize', 0) for col in collections if col['type'] == 'collection')
            total_index_size = sum(col.get('totalIndexSize', 0) for col in collections if col['type'] == 'collection')
            
            result = {
                'success': True,
                'database': {
                    'name': database_name,
                    'info': db_info,
                    'collections': collections,
                    'summary': {
                        'totalCollections': len([c for c in collections if c['type'] == 'collection']),
                        'totalViews': len([c for c in collections if c['type'] == 'view']),
                        'totalDocuments': total_documents,
                        'totalDataSize': total_data_size,
                        'totalStorageSize': total_storage_size,
                        'totalIndexSize': total_index_size
                    }
                }
            }
            
            self.logger.info(f"Successfully retrieved details for database {database_name}")
            return result
            
        except Exception as e:
            self.logger.error(f"Failed to get database details for {database_name}: {e}")
            raise
    
    def create_database(self, connection_string, database_name):
        """Create a new database (MongoDB creates databases implicitly)"""
        # Validate inputs
        is_valid, message = validate_connection_string(connection_string)
        if not is_valid:
            raise ValueError(message)
        
        is_valid, message = validate_database_name(database_name)
        if not is_valid:
            raise ValueError(message)
        
        try:
            with mongo_service.get_client(connection_string) as client:
                # Create a temporary collection to force database creation
                db = client[database_name]
                temp_collection = db['_temp_collection']
                temp_collection.insert_one({'temp': True})
                temp_collection.delete_one({'temp': True})
                
                self.logger.info(f"Successfully created database {database_name}")
                return {
                    'success': True,
                    'message': f'Database "{database_name}" created successfully',
                    'database_name': database_name
                }
                
        except Exception as e:
            self.logger.error(f"Failed to create database {database_name}: {e}")
            raise
    
    def drop_database(self, connection_string, database_name):
        """Drop a database"""
        # Validate inputs
        is_valid, message = validate_connection_string(connection_string)
        if not is_valid:
            raise ValueError(message)
        
        is_valid, message = validate_database_name(database_name)
        if not is_valid:
            raise ValueError(message)
        
        # Prevent dropping system databases
        system_databases = ['admin', 'local', 'config']
        if database_name in system_databases:
            raise ValueError(f"Cannot drop system database: {database_name}")
        
        try:
            with mongo_service.get_client(connection_string) as client:
                # Check if database exists
                db_list = client.list_database_names()
                if database_name not in db_list:
                    raise ValueError(f"Database '{database_name}' does not exist")
                
                # Drop the database
                client.drop_database(database_name)
                
                self.logger.info(f"Successfully dropped database {database_name}")
                return {
                    'success': True,
                    'message': f'Database "{database_name}" dropped successfully',
                    'database_name': database_name
                }
                
        except Exception as e:
            self.logger.error(f"Failed to drop database {database_name}: {e}")
            raise

# Global instance
database_service = DatabaseService()