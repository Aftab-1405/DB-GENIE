"""Main Flask application entry point"""

import os
import logging
from flask import Flask
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_session import Session
import redis
from config import get_config, ProductionConfig
from auth.routes import auth_bp
from api.routes import api_bp
from services.firestore_service import FirestoreService

def _register_error_handlers(app):
    """Register centralized error handlers for consistent JSON responses."""
    
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'status': 'error',
            'message': 'Bad request',
            'error_type': 'bad_request'
        }), 400
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'status': 'error',
            'message': 'Resource not found',
            'error_type': 'not_found'
        }), 404
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            'status': 'error',
            'message': 'Method not allowed',
            'error_type': 'method_not_allowed'
        }), 405
    
    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        return jsonify({
            'status': 'error',
            'message': 'Rate limit exceeded. Please wait and try again.',
            'error_type': 'rate_limit_exceeded'
        }), 429
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'status': 'error',
            'message': 'Internal server error',
            'error_type': 'internal_error'
        }), 500


def create_app():
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Get environment-specific configuration
    AppConfig = get_config()
    app.config.from_object(AppConfig)

    # Set up logging based on environment
    logging.basicConfig(level=getattr(logging, AppConfig.LOG_LEVEL))
    logger = logging.getLogger(__name__)
    
    # Log current environment
    logger.info(f"🚀 Starting application in {AppConfig.FLASK_ENV.upper()} mode")
    logger.info(f"   Debug: {AppConfig.DEBUG}, Testing: {AppConfig.TESTING}")
    
    # Production-specific validation
    if isinstance(AppConfig, type) and issubclass(AppConfig, ProductionConfig):
        ProductionConfig.validate_production_settings()

    # Validate Firebase configuration consistency
    try:
        AppConfig.validate_firebase_project_consistency()
    except ValueError as e:
        logger.error(f"Firebase configuration error: {e}")
        raise

    # Initialize CORS
    if AppConfig.CORS_ORIGINS:
        CORS(app, origins=AppConfig.CORS_ORIGINS, supports_credentials=True)
        logger.info(f"CORS enabled for origins: {AppConfig.CORS_ORIGINS}")

    # Initialize Rate Limiting
    if AppConfig.RATELIMIT_ENABLED:
        limiter = Limiter(
            app=app,
            key_func=get_remote_address,
            storage_uri=AppConfig.RATELIMIT_STORAGE_URL,
            default_limits=[AppConfig.RATELIMIT_DEFAULT]
        )
        logger.info(f"Rate limiting enabled: {AppConfig.RATELIMIT_DEFAULT}")

        # Store limiter for use in routes
        app.limiter = limiter

    # Initialize Redis Session Storage (Upstash)
    redis_url = os.getenv('UPSTASH_REDIS_URL')
    if redis_url:
        # Convert redis:// to rediss:// for TLS (Upstash requires TLS)
        if redis_url.startswith('redis://'):
            redis_url = redis_url.replace('redis://', 'rediss://', 1)
        
        app.config['SESSION_TYPE'] = 'redis'
        app.config['SESSION_PERMANENT'] = True
        app.config['SESSION_USE_SIGNER'] = True
        app.config['SESSION_REDIS'] = redis.from_url(redis_url)
        Session(app)
        logger.info("✅ Redis session storage enabled (Upstash)")
    else:
        logger.warning("⚠️ UPSTASH_REDIS_URL not set, using in-memory sessions (not recommended for production)")

    # Initialize services
    FirestoreService.initialize()

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(api_bp, url_prefix='/api')
    
    # Register error handlers
    _register_error_handlers(app)

    logger.info("✅ Application initialized successfully")
    return app


# Application instance - created at module level for WSGI servers (Gunicorn, uWSGI)
# For testing, use create_app() directly to get isolated instances
app = create_app()

if __name__ == '__main__':
    app.run(debug=app.config.get('DEBUG', True))
