from flask import Blueprint, request, jsonify
from services.collection_service import collection_service
from utils import require_json, validate_request_data, handle_error
import logging

collection_bp = Blueprint('collection', __name__)
logger = logging.getLogger(__name__)

@collection_bp.route('/list', methods=['POST'])
@require_json()
@validate_request_data(['connection_string', 'database_name'])
def list_collections():
    """Get list of collections in a database"""
    try:
        data = request.get_json()
        connection_string = data['connection_string']
        database_name = data['database_name']
        print(data)
        result = collection_service.list_collections(connection_string, database_name)
        return jsonify(result), 200
        
    except Exception as e:
        return handle_error(e)

@collection_bp.route('/details', methods=['POST'])
@require_json()
@validate_request_data(['connection_string', 'database_name', 'collection_name'])
def get_collection_details():
    """Get detailed information about a specific collection"""
    try:
        data = request.get_json()
        connection_string = data['connection_string']
        database_name = data['database_name']
        collection_name = data['collection_name']
        
        result = collection_service.get_collection_details(
            connection_string, database_name, collection_name
        )
        return jsonify(result), 200
        
    except Exception as e:
        return handle_error(e)

@collection_bp.route('/copy', methods=['POST'])
@require_json()
@validate_request_data(['connection_string', 'source_database', 'target_database', 'collection_name'])
def copy_collection():
    """Copy a collection from one database to another"""
    try:
        data = request.get_json()
        connection_string = data['connection_string']
        source_database = data['source_database']
        target_database = data['target_database']
        collection_name = data['collection_name']
        new_collection_name = data.get('new_collection_name')  # Optional
        
        result = collection_service.copy_collection(
            connection_string,
            source_database,
            target_database,
            collection_name,
            new_collection_name
        )
        return jsonify(result), 200
        
    except Exception as e:
        return handle_error(e)

@collection_bp.route('/drop', methods=['DELETE'])
@require_json()
@validate_request_data(['connection_string', 'database_name', 'collection_names'])
def drop_collections():
    """Drop multiple collections from a database"""
    try:
        data = request.get_json()
        connection_string = data['connection_string']
        database_name = data['database_name']
        collection_names = data['collection_names']
        
        # Validate that collection_names is a list
        if not isinstance(collection_names, list):
            return jsonify({
                'error': 'Invalid input',
                'message': 'collection_names must be an array'
            }), 400
        
        # Additional confirmation required for dropping collections
        confirm = data.get('confirm', False)
        if not confirm:
            return jsonify({
                'error': 'Confirmation required',
                'message': 'Set "confirm": true to proceed with collection deletion'
            }), 400
        
        result = collection_service.drop_collections(
            connection_string, database_name, collection_names
        )
        return jsonify(result), 200
        
    except Exception as e:
        return handle_error(e)

@collection_bp.route('/create', methods=['POST'])
@require_json()
@validate_request_data(['connection_string', 'database_name', 'collection_name'])
def create_collection():
    """Create a new collection"""
    try:
        data = request.get_json()
        connection_string = data['connection_string']
        database_name = data['database_name']
        collection_name = data['collection_name']
        options = data.get('options', {})  # Optional collection options
        
        result = collection_service.create_collection(
            connection_string, database_name, collection_name, options
        )
        return jsonify(result), 201
        
    except Exception as e:
        return handle_error(e)

@collection_bp.route('/rename', methods=['POST'])
@require_json()
@validate_request_data(['connection_string', 'database_name', 'old_name', 'new_name'])
def rename_collection():
    """Rename a collection"""
    try:
        data = request.get_json()
        connection_string = data['connection_string']
        database_name = data['database_name']
        old_name = data['old_name']
        new_name = data['new_name']
        
        # For simplicity, we'll implement rename as copy + drop
        # First copy the collection
        copy_result = collection_service.copy_collection(
            connection_string, database_name, database_name, old_name, new_name
        )
        
        if copy_result['success']:
            # Then drop the original
            drop_result = collection_service.drop_collections(
                connection_string, database_name, [old_name]
            )
            
            if drop_result['summary']['successful'] > 0:
                return jsonify({
                    'success': True,
                    'message': f'Collection renamed from "{old_name}" to "{new_name}"',
                    'database': database_name,
                    'old_name': old_name,
                    'new_name': new_name
                }), 200
            else:
                # If drop failed, we should clean up the copied collection
                collection_service.drop_collections(
                    connection_string, database_name, [new_name]
                )
                return jsonify({
                    'success': False,
                    'message': 'Failed to complete rename operation'
                }), 500
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to copy collection for rename'
            }), 500
        
    except Exception as e:
        return handle_error(e)

@collection_bp.route('/count', methods=['POST'])
@require_json()
@validate_request_data(['connection_string', 'database_name', 'collection_name'])
def count_documents():
    """Get document count for a collection"""
    try:
        data = request.get_json()
        connection_string = data['connection_string']
        database_name = data['database_name']
        collection_name = data['collection_name']
        query = data.get('query', {})  # Optional query filter
        
        from services.mongo_service import mongo_service
        from utils import validate_database_name, validate_collection_name, validate_connection_string
        
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
        
        with mongo_service.get_client(connection_string) as client:
            collection = client[database_name][collection_name]
            count = collection.count_documents(query)
            
            return jsonify({
                'success': True,
                'database': database_name,
                'collection': collection_name,
                'count': count,
                'query': query
            }), 200
        
    except Exception as e:
        return handle_error(e)