import os
from typing import Optional


class Config:
    """Configuration class for the Kleos Agent"""

    # Agent Configuration
    AGENT_NAME: str = os.getenv("AGENT_NAME", "Kleos Agent")
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"

    # API Configuration
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))

    # Blockchain Configuration
    WEB3_PROVIDER_URL: Optional[str] = os.getenv("WEB3_PROVIDER_URL")
    PRIVATE_KEY: Optional[str] = os.getenv("PRIVATE_KEY")

    @classmethod
    def validate(cls) -> bool:
        """Validate required configuration"""
        # Add validation logic as needed
        return True
