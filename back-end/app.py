"""Main Flask application entry point"""

import logging
from flask import Flask
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from config import get_config, ProductionConfig
from auth.routes import auth_bp
from api.routes import api_bp
from services.firestore_service import FirestoreService

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

    # Initialize services
    FirestoreService.initialize()

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(api_bp)

    logger.info("✅ Application initialized successfully")
    return app

# Create the app instance
app = create_app()

if __name__ == '__main__':
    app.run(debug=app.config.get('DEBUG', True))
