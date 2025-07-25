from flask import Blueprint, request, jsonify
from services.database_service import database_service
from utils import require_json, validate_request_data, handle_error
import logging

database_bp = Blueprint('database', __name__)
logger = logging.getLogger(__name__)

@database_bp.route('/test-connection', methods=['POST'])
@require_json()
@validate_request_data(['connection_string'])
def test_connection():
    """Test MongoDB connection"""
    try:
        data = request.get_json()
        connection_string = data['connection_string']
        
        result = database_service.test_connection(connection_string)
        return jsonify(result), 200
        
    except Exception as e:
        return handle_error(e)

@database_bp.route('/list', methods=['POST'])
@require_json()
@validate_request_data(['connection_string'])
def list_databases():
    """Get list of all databases"""
    try:
        data = request.get_json()
        connection_string = data['connection_string']
        
        result = database_service.list_databases(connection_string)
        return jsonify(result), 200
        
    except Exception as e:
        return handle_error(e)

@database_bp.route('/details', methods=['POST'])
@require_json()
@validate_request_data(['connection_string', 'database_name'])
def get_database_details():
    """Get detailed information about a specific database"""
    try:
        data = request.get_json()
        connection_string = data['connection_string']
        database_name = data['database_name']
        
        result = database_service.get_database_details(connection_string, database_name)
        return jsonify(result), 200
        
    except Exception as e:
        return handle_error(e)

@database_bp.route('/create', methods=['POST'])
@require_json()
@validate_request_data(['connection_string', 'database_name'])
def create_database():
    """Create a new database"""
    try:
        data = request.get_json()
        connection_string = data['connection_string']
        database_name = data['database_name']
        
        result = database_service.create_database(connection_string, database_name)
        return jsonify(result), 201
        
    except Exception as e:
        return handle_error(e)

@database_bp.route('/drop', methods=['DELETE'])
@require_json()
@validate_request_data(['connection_string', 'database_name'])
def drop_database():
    """Drop a database"""
    try:
        data = request.get_json()
        connection_string = data['connection_string']
        database_name = data['database_name']
        
        # Additional confirmation required for dropping databases
        confirm = data.get('confirm', False)
        if not confirm:
            return jsonify({
                'error': 'Confirmation required',
                'message': 'Set "confirm": true to proceed with database deletion'
            }), 400
        
        result = database_service.drop_database(connection_string, database_name)
        return jsonify(result), 200
        
    except Exception as e:
        return handle_error(e)

@database_bp.route('/info', methods=['POST'])
@require_json()
@validate_request_data(['connection_string', 'database_name'])
def get_database_info():
    """Get basic database information"""
    try:
        data = request.get_json()
        connection_string = data['connection_string']
        database_name = data['database_name']
        
        # This is similar to details but returns just the info part
        result = database_service.get_database_details(connection_string, database_name)
        
        # Return only the database info and summary
        response = {
            'success': True,
            'database': {
                'name': database_name,
                'info': result['database']['info'],
                'summary': result['database']['summary']
            }
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        return handle_error(e)