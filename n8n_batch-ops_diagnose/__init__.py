"""
AINOVA_OS MCP Server - n8n Integration Package
Outils d'orchestration n8n : credentials, workflows, diagnostics.

Bulkhead Pattern: Ce package est isolé — un échec ici n'affecte
ni system_core, ni database, ni le registry.

Résout le problème #1 : le mapping credentials ↔ workflows.
"""

import logging
import sys

logger = logging.getLogger("mcp.tools.n8n")

# Package metadata
__package_name__ = "n8n"
__version__ = "1.0.0"
__isolation_level__ = "STRICT"
__status__ = "INITIALIZING"
__tools__ = [
    "n8n_list_credentials",
    "n8n_list_workflows",
    "n8n_patch_credentials",
    "n8n_import_workflow",
    "n8n_activate_workflow",
    "n8n_diagnose_workflow",
]

try:
    if sys.version_info < (3, 10):
        raise RuntimeError("n8n package requires Python 3.10+")
    __status__ = "ACTIVE"
    logger.info(f"n8n package v{__version__} initialized (isolation: {__isolation_level__})")
except Exception as e:
    logger.error(f"CRITICAL: n8n package init failed: {e}")
    __status__ = "FAILED"
    __failure_reason__ = str(e)


def __getattr__(name: str):
    """Lazy loading — modules chargés uniquement à la demande."""
    if __status__ == "FAILED":
        raise ImportError(f"n8n package is in FAILED state: {__failure_reason__}")

    if name in ("N8nCredentialsTool", "N8nPatchCredentialsTool"):
        from .credentials import N8nCredentialsTool, N8nPatchCredentialsTool
        return locals()[name]

    if name in ("N8nListWorkflowsTool", "N8nImportWorkflowTool",
                "N8nActivateWorkflowTool", "N8nDiagnoseWorkflowTool"):
        from .workflows import (
            N8nListWorkflowsTool, N8nImportWorkflowTool,
            N8nActivateWorkflowTool, N8nDiagnoseWorkflowTool
        )
        return locals()[name]

    raise AttributeError(f"module 'tools.n8n' has no attribute '{name}'")


def validate_package_health() -> bool:
    return __status__ == "ACTIVE"


def get_package_info() -> dict:
    return {
        "name": __package_name__,
        "version": __version__,
        "status": __status__,
        "isolation_level": __isolation_level__,
        "tools": __tools__,
    }
