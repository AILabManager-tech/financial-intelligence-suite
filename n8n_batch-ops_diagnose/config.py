"""
AINOVA_OS MCP Server - n8n Configuration
Paramètres de connexion à l'instance n8n.

Usage:
    Définir les variables d'environnement ou éditer les valeurs par défaut.
    N8N_BASE_URL : URL de l'instance n8n (défaut: http://localhost:5678)
    N8N_API_KEY  : Clé API n8n (Settings > API > Create API Key)
"""

import os
from dataclasses import dataclass


@dataclass
class N8nConfig:
    """Configuration de connexion n8n."""
    base_url: str = os.getenv("N8N_BASE_URL", "http://localhost:5678")
    api_key: str = os.getenv("N8N_API_KEY", "")

    @property
    def headers(self) -> dict:
        return {
            "X-N8N-API-KEY": self.api_key,
            "Content-Type": "application/json",
        }

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)


# Singleton
config = N8nConfig()
