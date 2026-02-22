"""
AINOVA_OS MCP Server - n8n Credentials Tools
Résout le problème central : mapping credentials ↔ workflows.

Tools:
    n8n_list_credentials  — Liste toutes les credentials de l'instance
    n8n_patch_credentials — Injecte les credentials dans un workflow JSON

Ce module est le chaînon manquant entre la génération de workflows
par IA et leur fonctionnement réel dans n8n.
"""

import json
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import aiohttp

sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from core.registry import BaseTool
from .config import config

logger = logging.getLogger("mcp.tools.n8n.credentials")


class N8nCredentialsTool(BaseTool):
    """
    Liste toutes les credentials configurées dans n8n.

    Retourne un index {type → {id, name}} utilisable pour le patching.
    C'est la première étape : savoir ce qui est disponible.

    Exemple:
        result = await tool.execute()
        # → {"openAiApi": {"id": "1", "name": "Mon OpenAI"}, ...}
    """

    name = "n8n_list_credentials"
    description = "Liste les credentials n8n disponibles, indexées par type"

    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "show_all_duplicates": {
                    "type": "boolean",
                    "description": "Si True, retourne toutes les credentials (même type dupliqué). Sinon, une par type.",
                    "default": False,
                }
            },
            "required": [],
        }

    async def execute(self, show_all_duplicates: bool = False) -> Dict[str, Any]:
        """
        Interroge GET /api/v1/credentials et construit l'index.

        Returns:
            success, credential_map (type→info), total count
        """
        if not config.is_configured:
            return {
                "success": False,
                "error": "N8N_API_KEY non configurée. Définir la variable d'environnement N8N_API_KEY.",
                "credential_map": {},
            }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{config.base_url}/api/v1/credentials",
                    headers=config.headers,
                    timeout=aiohttp.ClientTimeout(total=15),
                ) as resp:
                    if resp.status != 200:
                        body = await resp.text()
                        return {
                            "success": False,
                            "error": f"n8n API HTTP {resp.status}: {body[:200]}",
                            "credential_map": {},
                        }

                    data = await resp.json()

            credentials = data.get("data", data) if isinstance(data, dict) else data

            if show_all_duplicates:
                # Liste complète
                cred_list = [
                    {"id": c["id"], "name": c["name"], "type": c["type"]}
                    for c in credentials
                ]
                return {
                    "success": True,
                    "credentials": cred_list,
                    "total": len(cred_list),
                }
            else:
                # Index unique par type (premier trouvé gagne)
                cred_map = {}
                for c in credentials:
                    ctype = c["type"]
                    if ctype not in cred_map:
                        cred_map[ctype] = {"id": c["id"], "name": c["name"]}

                return {
                    "success": True,
                    "credential_map": cred_map,
                    "total": len(cred_map),
                    "hint": "Utilisez n8n_patch_credentials pour injecter ces IDs dans un workflow.",
                }

        except aiohttp.ClientError as e:
            return {
                "success": False,
                "error": f"Connexion n8n échouée: {e}. Vérifier que n8n tourne sur {config.base_url}",
                "credential_map": {},
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Erreur inattendue: {e}",
                "credential_map": {},
            }


class N8nPatchCredentialsTool(BaseTool):
    """
    Injecte automatiquement les credentials dans un workflow JSON.

    C'est LE tool qui résout le problème. Il prend un workflow généré
    par IA (ChatGPT, Claude, etc.) et branche les bonnes credentials
    en matchant le type de credential requis par chaque node avec
    celles disponibles dans l'instance n8n.

    Flux:
        1. Récupère la credential_map depuis n8n API
        2. Parcourt chaque node du workflow
        3. Pour chaque credential requise, injecte l'id et le name
        4. Retourne le workflow patché + rapport

    Exemple:
        result = await tool.execute(workflow_json='{"nodes": [...]}')
        patched = result["patched_workflow"]  # Prêt à importer
    """

    name = "n8n_patch_credentials"
    description = "Injecte les credentials dans un workflow JSON généré par IA"

    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "workflow_json": {
                    "type": "string",
                    "description": "Workflow n8n au format JSON (string)",
                },
                "workflow_path": {
                    "type": "string",
                    "description": "Ou chemin vers un fichier .json (alternatif à workflow_json)",
                },
                "credential_overrides": {
                    "type": "object",
                    "description": "Overrides manuels: {credential_type: credential_id}. Prioritaire sur l'auto-mapping.",
                    "default": {},
                },
            },
            "required": [],
        }

    async def execute(
        self,
        workflow_json: Optional[str] = None,
        workflow_path: Optional[str] = None,
        credential_overrides: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Patche les credentials d'un workflow.

        Returns:
            patched_workflow (dict), patched_count, missing list, report
        """
        credential_overrides = credential_overrides or {}

        # --- 1. Charger le workflow ---
        if workflow_json:
            try:
                wf = json.loads(workflow_json)
            except json.JSONDecodeError as e:
                return {"success": False, "error": f"JSON invalide: {e}"}
        elif workflow_path:
            try:
                wf_path = Path(workflow_path)
                if not wf_path.exists():
                    return {"success": False, "error": f"Fichier non trouvé: {workflow_path}"}
                wf = json.loads(wf_path.read_text(encoding="utf-8"))
            except Exception as e:
                return {"success": False, "error": f"Erreur lecture fichier: {e}"}
        else:
            return {"success": False, "error": "Fournir workflow_json ou workflow_path"}

        # --- 2. Récupérer la credential map depuis n8n ---
        cred_tool = N8nCredentialsTool()
        cred_result = await cred_tool.execute(show_all_duplicates=False)

        if not cred_result.get("success"):
            return {
                "success": False,
                "error": f"Impossible de récupérer les credentials: {cred_result.get('error')}",
            }

        cred_map = cred_result["credential_map"]

        # --- 3. Appliquer les overrides ---
        for ctype, cid in credential_overrides.items():
            cred_map[ctype] = {"id": str(cid), "name": f"override-{ctype}"}

        # --- 4. Patcher chaque node ---
        patched = 0
        missing = []
        report = []

        nodes = wf.get("nodes", [])
        for node in nodes:
            if "credentials" not in node:
                continue

            for cred_type, cred_ref in node["credentials"].items():
                if cred_type in cred_map:
                    old_id = cred_ref.get("id", "?")
                    cred_ref["id"] = cred_map[cred_type]["id"]
                    cred_ref["name"] = cred_map[cred_type]["name"]
                    patched += 1
                    report.append({
                        "node": node.get("name", "?"),
                        "type": cred_type,
                        "status": "patched",
                        "credential_id": cred_map[cred_type]["id"],
                        "credential_name": cred_map[cred_type]["name"],
                    })
                else:
                    missing.append({
                        "node": node.get("name", "?"),
                        "type": cred_type,
                        "status": "missing",
                    })
                    report.append({
                        "node": node.get("name", "?"),
                        "type": cred_type,
                        "status": "MISSING — créer cette credential dans n8n UI",
                    })

        return {
            "success": True,
            "patched_workflow": wf,
            "patched_count": patched,
            "missing_count": len(missing),
            "missing": missing,
            "report": report,
            "total_nodes": len(nodes),
            "hint": (
                "Utilisez n8n_import_workflow pour déployer le workflow patché."
                if not missing
                else f"⚠️ {len(missing)} credential(s) manquante(s) — les créer dans n8n UI d'abord."
            ),
        }
