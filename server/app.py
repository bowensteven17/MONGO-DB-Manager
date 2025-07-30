from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from dotenv import load_dotenv
import os
import logging
from datetime import datetime

# Load environment variables
load_dotenv()

# Import route blueprints
from routes.database import database_bp
from routes.collection import collection_bp
from routes.backup import backup_bp

# Import utilities
from utils import setup_logging, create_directories, handle_error

def create_app():
    app = Flask(__name__)
    
    # Setup logging
    setup_logging()
    
    # Create required directories
    create_directories()
    
    # CORS configuration
    allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(',')
    CORS(app, origins=[origin.strip() for origin in allowed_origins])
    
    # Rate limiting
    limiter = Limiter(
        key_func=get_remote_address,
        default_limits=[
            os.getenv('RATE_LIMIT_DAY', '500 per day'),
            os.getenv('RATE_LIMIT_HOUR', '100 per hour')
        ],
        storage_uri=os.getenv('RATELIMIT_STORAGE_URL', 'memory://')
    )
    limiter.init_app(app)
    
    # Register blueprints
    app.register_blueprint(database_bp, url_prefix='/api/database')
    app.register_blueprint(collection_bp, url_prefix='/api/collection')
    app.register_blueprint(backup_bp, url_prefix='/api/backup')
    app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max file size
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return jsonify({
            'status': 'OK',
            'timestamp': datetime.utcnow().isoformat(),
            'name': os.getenv('APP_NAME', 'MongoDB Utility'),
            'version': os.getenv('APP_VERSION', '1.0.0'),
            'environment': os.getenv('FLASK_ENV', 'development')
        })
    
    # Root endpoint
    @app.route('/')
    def root():
        return jsonify({
            'message': f"{os.getenv('APP_NAME', 'MongoDB Utility')} API",
            'version': os.getenv('APP_VERSION', '1.0.0'),
            'endpoints': {
                'health': '/health',
                'database': '/api/database',
                'collection': '/api/collection',
                'backup': '/api/backup'
            }
        })
    
    # Global error handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Bad request', 'message': str(error)}), 400
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found', 'message': 'The requested resource was not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        logging.error(f"Internal server error: {error}")
        return jsonify({'error': 'Internal server error', 'message': 'An unexpected error occurred'}), 500
    
    @app.errorhandler(Exception)
    def handle_exception(error):
        logging.error(f"Unhandled exception: {error}")
        return handle_error(error)
    
    # Request logging middleware
    @app.before_request
    def log_request():
        if os.getenv('FLASK_ENV') == 'development':
            logging.info(f"{request.method} {request.url} - {request.remote_addr}")
    
    # Response headers
    @app.after_request
    def after_request(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        return response
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(
        host=os.getenv('HOST', '127.0.0.1'),
        port=int(os.getenv('PORT', 5000)),
        debug=os.getenv('FLASK_ENV') == 'development'
    )