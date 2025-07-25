from flask import Blueprint

# Import all route blueprints
from .database import database_bp
from .collection import collection_bp
from .backup import backup_bp

# Create a main blueprint that combines all routes
main_bp = Blueprint('main', __name__)

# Register all blueprints
def register_blueprints(app):
    """Register all blueprints with the Flask app"""
    app.register_blueprint(database_bp, url_prefix='/api/database')
    app.register_blueprint(collection_bp, url_prefix='/api/collection')
    app.register_blueprint(backup_bp, url_prefix='/api/backup')

# Export blueprints for manual registration if needed
__all__ = ['database_bp', 'collection_bp', 'backup_bp', 'register_blueprints']