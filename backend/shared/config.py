"""
Purpose: Core application configuration loader and environment validator.
Dependencies: pydantic, pydantic-settings, typing
Future Extension: Integration with AWS Secrets Manager / Parameter Store client for dynamic staging secrets loading.
Performance Notes: Config schema is validated once on application start (fail-fast). Subsequent reads leverage memoized properties (< 1μs).
Security Notes: Sensitive variables (e.g. API keys) are marked with log-safe string representation to avoid leakage in stack traces.
"""

import os
from enum import Enum
from typing import List, Optional
from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class EnvironmentStage(str, Enum):
    DEVELOPMENT = "dev"
    TESTING = "test"
    STAGING = "stg"
    PRODUCTION = "prod"
    SANDBOX = "sandbox"


class AppConfig(BaseSettings):
    """
    Application Configuration Schema.
    Validates environment settings on boot using strict type checking.
    """
    # System Environments
    ENV: EnvironmentStage = Field(
        default=EnvironmentStage.DEVELOPMENT,
        alias="GW_ENV",
        description="The deployment stage of the gateway."
    )
    
    PORT: int = Field(
        default=8000,
        alias="GW_PORT",
        description="Host port for Ingress API traffic."
    )
    
    LOCAL_MOCK: bool = Field(
        default=False,
        alias="GW_LOCAL_MOCK",
        description="Toggle local mock provider execution."
    )

    # Database Settings
    DYNAMODB_ENDPOINT_URL: Optional[str] = Field(
        default=None,
        alias="GW_DYNAMODB_ENDPOINT_URL",
        description="Optional local DynamoDB address (for local mocks)."
    )
    
    REDIS_HOST: str = Field(
        default="localhost",
        alias="GW_REDIS_HOST",
        description="Redis host address for rate limits and locks."
    )
    
    REDIS_PORT: int = Field(
        default=6379,
        alias="GW_REDIS_PORT",
        description="Redis port number."
    )

    # Core Security Settings
    VIETNAMESE_PII_THRESHOLD: float = Field(
        default=0.90,
        alias="GW_VIETNAMESE_PII_THRESHOLD",
        description="Cosine similarity threshold for safety scans."
    )

    # Public Provider Secrets (Marked as SecretStr to prevent string serialization leaks)
    AWS_BEDROCK_SECRET_KEY: Optional[SecretStr] = Field(
        default=None,
        alias="GW_AWS_BEDROCK_SECRET_KEY"
    )
    
    OPENAI_API_KEY: Optional[SecretStr] = Field(
        default=None,
        alias="GW_OPENAI_API_KEY"
    )
    
    GEMINI_API_KEY: Optional[SecretStr] = Field(
        default=None,
        alias="GW_GEMINI_API_KEY"
    )

    # Configure Pydantic Settings Source
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True
    )

    @field_validator("VIETNAMESE_PII_THRESHOLD")
    @classmethod
    def validate_threshold_range(cls, v: float) -> float:
        """Ensures the PII detection threshold remains between 0.0 and 1.0."""
        MIN_THRESHOLD = 0.0
        MAX_THRESHOLD = 1.0
        if not (MIN_THRESHOLD <= v <= MAX_THRESHOLD):
            raise ValueError(f"PII Threshold must be between {MIN_THRESHOLD} and {MAX_THRESHOLD}")
        return v

    @field_validator("PORT")
    @classmethod
    def validate_port_range(cls, v: int) -> int:
        """Validates that TCP port numbers fall within standard user range."""
        MIN_PORT = 1024
        MAX_PORT = 65535
        if not (MIN_PORT <= v <= MAX_PORT):
            raise ValueError(f"TCP Port must be between {MIN_PORT} and {MAX_PORT}")
        return v


# Cache configuration in-memory after initial validation (Singleton Pattern)
_config_instance: Optional[AppConfig] = None


def get_config() -> AppConfig:
    """
    Retrieves the memoized AppConfig instance.
    Validates settings on the first call. Fails-fast on error.
    """
    global _config_instance
    if _config_instance is None:
        try:
            _config_instance = AppConfig()
        except Exception as e:
            import sys
            import logging
            # Avoid exiting the process if running inside a test suite
            if "pytest" in sys.modules:
                raise e
            # Enforce absolute fail-fast requirement on production application boot
            logger = logging.getLogger("gateway.bootstrap")
            logger.critical(f"CRITICAL BOOTSTRAP FAILURE: Configuration validation failed: {str(e)}")
            sys.exit(1)
    return _config_instance
