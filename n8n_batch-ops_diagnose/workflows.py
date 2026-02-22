"""
AINOVA_OS MCP Server - n8n Workflow Tools
CRUD et diagnostics pour les workflows n8n.

Tools:
    n8n_list_workflows    — Liste les workflows avec statut
    n8n_import_workflow    — Importe un workflow (patché) dans n8n
    n8n_activate_workflow  — Active/désactive un workflow
    n8n_diagnose_workflow  — Diagnostic complet d'un workflow (credentials, nodes, connections)
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
from .credentials import N8nCredentialsTool

logger = logging.getLogger("mcp.tools.n8n.workflows")


class N8nListWorkflowsTool(BaseTool):
    """
    Liste les workflows de l'instance n8n avec filtrage optionnel.

    Exemple:
        result = await tool.execute(active_only=False)
        for wf in result["workflows"]:
            print(f"{wf['id']} | {wf['name']} | active={wf['active']}")
    """

    name = "n8n_list_workflows"
    description = "Liste les workflows n8n avec leur statut d'activation"

    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "active_only": {
                    "type": "boolean",
                    "description": "Filtrer uniquement les workflows actifs",
                    "default": False,
                },
                "tag": {
                    "type": "string",
                    "description": "Filtrer par tag (ex: 'ainova', 'broken')",
                    "default": "",
                },
                "limit": {
                    "type": "integer",
                    "description": "Nombre max de workflows à retourner",
                    "default": 250,
                },
            },
            "required": [],
        }

    async def execute(
        self,
        active_only: bool = False,
        tag: str = "",
        limit: int = 250,
    ) -> Dict[str, Any]:
        if not config.is_configured:
            return {"success": False, "error": "N8N_API_KEY non configurée."}

        try:
            params = {"limit": min(limit, 250)}
            if active_only:
                params["active"] = "true"
            if tag:
                params["tags"] = tag

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{config.base_url}/api/v1/workflows",
                    headers=config.headers,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    if resp.status != 200:
                        return {"success": False, "error": f"HTTP {resp.status}: {await resp.text()}"}
                    data = await resp.json()

            workflows = data.get("data", data) if isinstance(data, dict) else data

            summary = []
            active_count = 0
            inactive_count = 0

            for wf in workflows:
                is_active = wf.get("active", False)
                if is_active:
                    active_count += 1
                else:
                    inactive_count += 1

                node_count = len(wf.get("nodes", []))
                cred_types = set()
                for node in wf.get("nodes", []):
                    if "credentials" in node:
                        cred_types.update(node["credentials"].keys())

                summary.append({
                    "id": wf.get("id"),
                    "name": wf.get("name", "Sans nom"),
                    "active": is_active,
                    "nodes": node_count,
                    "credential_types_needed": list(cred_types),
                    "tags": [t.get("name", "") for t in wf.get("tags", [])],
                    "updated_at": wf.get("updatedAt", ""),
                })

            return {
                "success": True,
                "workflows": summary,
                "total": len(summary),
                "active": active_count,
                "inactive": inactive_count,
            }

        except aiohttp.ClientError as e:
            return {"success": False, "error": f"Connexion n8n échouée: {e}"}
        except Exception as e:
            return {"success": False, "error": f"Erreur: {e}"}


class N8nImportWorkflowTool(BaseTool):
    """
    Importe un workflow dans n8n via l'API.

    Accepte un workflow JSON (déjà patché avec les credentials)
    et le crée dans l'instance n8n. Retourne l'ID du workflow créé.

    Pipeline typique:
        1. Générer le workflow (ChatGPT / Claude)
        2. n8n_patch_credentials → injecter les credentials
        3. n8n_import_workflow → déployer dans n8n
        4. n8n_activate_workflow → activer
    """

    name = "n8n_import_workflow"
    description = "Importe un workflow JSON dans n8n (POST /api/v1/workflows)"

    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "workflow_json": {
                    "type": "string",
                    "description": "Workflow JSON complet (string)",
                },
                "workflow_path": {
                    "type": "string",
                    "description": "Chemin vers un fichier .json (alternatif)",
                },
                "name_override": {
                    "type": "string",
                    "description": "Renommer le workflow à l'import",
                    "default": "",
                },
                "activate": {
                    "type": "boolean",
                    "description": "Activer immédiatement après import",
                    "default": False,
                },
            },
            "required": [],
        }

    async def execute(
        self,
        workflow_json: Optional[str] = None,
        workflow_path: Optional[str] = None,
        name_override: str = "",
        activate: bool = False,
    ) -> Dict[str, Any]:
        if not config.is_configured:
            return {"success": False, "error": "N8N_API_KEY non configurée."}

        # Charger le workflow
        if workflow_json:
            try:
                wf = json.loads(workflow_json) if isinstance(workflow_json, str) else workflow_json
            except json.JSONDecodeError as e:
                return {"success": False, "error": f"JSON invalide: {e}"}
        elif workflow_path:
            try:
                wf = json.loads(Path(workflow_path).read_text(encoding="utf-8"))
            except Exception as e:
                return {"success": False, "error": f"Erreur lecture: {e}"}
        else:
            return {"success": False, "error": "Fournir workflow_json ou workflow_path"}

        if name_override:
            wf["name"] = name_override

        # Nettoyage: retirer les champs qui causent des conflits à l'import
        for field in ("id", "versionId", "createdAt", "updatedAt"):
            wf.pop(field, None)

        try:
            async with aiohttp.ClientSession() as session:
                # Créer le workflow
                async with session.post(
                    f"{config.base_url}/api/v1/workflows",
                    headers=config.headers,
                    json=wf,
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    if resp.status not in (200, 201):
                        body = await resp.text()
                        return {"success": False, "error": f"Import échoué HTTP {resp.status}: {body[:500]}"}

                    created = await resp.json()

                workflow_id = created.get("id")
                workflow_name = created.get("name", "?")

                # Activer si demandé
                if activate and workflow_id:
                    async with session.patch(
                        f"{config.base_url}/api/v1/workflows/{workflow_id}",
                        headers=config.headers,
                        json={"active": True},
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as act_resp:
                        activated = act_resp.status == 200
                else:
                    activated = False

                return {
                    "success": True,
                    "workflow_id": workflow_id,
                    "workflow_name": workflow_name,
                    "activated": activated,
                    "url": f"{config.base_url}/workflow/{workflow_id}",
                    "hint": (
                        f"Workflow déployé → {config.base_url}/workflow/{workflow_id}"
                        + (" (actif)" if activated else " — penser à l'activer")
                    ),
                }

        except aiohttp.ClientError as e:
            return {"success": False, "error": f"Connexion n8n échouée: {e}"}
        except Exception as e:
            return {"success": False, "error": f"Erreur: {e}"}


class N8nActivateWorkflowTool(BaseTool):
    """Active ou désactive un workflow n8n par ID."""

    name = "n8n_activate_workflow"
    description = "Active ou désactive un workflow n8n"

    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "workflow_id": {"type": "string", "description": "ID du workflow"},
                "active": {"type": "boolean", "description": "True=activer, False=désactiver", "default": True},
            },
            "required": ["workflow_id"],
        }

    async def execute(self, workflow_id: str, active: bool = True) -> Dict[str, Any]:
        if not config.is_configured:
            return {"success": False, "error": "N8N_API_KEY non configurée."}

        try:
            async with aiohttp.ClientSession() as session:
                async with session.patch(
                    f"{config.base_url}/api/v1/workflows/{workflow_id}",
                    headers=config.headers,
                    json={"active": active},
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as resp:
                    if resp.status != 200:
                        return {"success": False, "error": f"HTTP {resp.status}: {await resp.text()}"}
                    data = await resp.json()

            return {
                "success": True,
                "workflow_id": workflow_id,
                "active": data.get("active", active),
                "name": data.get("name", "?"),
            }

        except Exception as e:
            return {"success": False, "error": str(e)}


class N8nDiagnoseWorkflowTool(BaseTool):
    """
    Diagnostic complet d'un workflow : credentials manquantes,
    nodes obsolètes, connections cassées.

    C'est l'outil de triage. Lance-le sur tes 200 workflows
    pour savoir exactement lesquels sont réparables automatiquement
    et lesquels nécessitent une intervention manuelle.
    """

    name = "n8n_diagnose_workflow"
    description = "Diagnostic complet d'un workflow n8n (credentials, nodes, connections)"

    def get_schema(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "workflow_id": {
                    "type": "string",
                    "description": "ID du workflow à diagnostiquer",
                },
                "workflow_json": {
                    "type": "string",
                    "description": "Ou le JSON brut du workflow (alternatif)",
                },
            },
            "required": [],
        }

    async def execute(
        self,
        workflow_id: Optional[str] = None,
        workflow_json: Optional[str] = None,
    ) -> Dict[str, Any]:
        # Charger le workflow
        if workflow_id:
            if not config.is_configured:
                return {"success": False, "error": "N8N_API_KEY non configurée."}
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{config.base_url}/api/v1/workflows/{workflow_id}",
                        headers=config.headers,
                        timeout=aiohttp.ClientTimeout(total=15),
                    ) as resp:
                        if resp.status != 200:
                            return {"success": False, "error": f"HTTP {resp.status}"}
                        wf = await resp.json()
            except Exception as e:
                return {"success": False, "error": str(e)}
        elif workflow_json:
            try:
                wf = json.loads(workflow_json)
            except json.JSONDecodeError as e:
                return {"success": False, "error": f"JSON invalide: {e}"}
        else:
            return {"success": False, "error": "Fournir workflow_id ou workflow_json"}

        # Récupérer les credentials disponibles
        available_creds = {}
        if config.is_configured:
            cred_tool = N8nCredentialsTool()
            cred_result = await cred_tool.execute()
            if cred_result.get("success"):
                available_creds = cred_result.get("credential_map", {})

        # Diagnostic
        nodes = wf.get("nodes", [])
        connections = wf.get("connections", {})
        issues = []
        warnings = []

        # --- Check credentials ---
        creds_ok = 0
        creds_missing = 0
        creds_fixable = 0

        for node in nodes:
            if "credentials" not in node:
                continue
            for cred_type, cred_ref in node["credentials"].items():
                has_id = bool(cred_ref.get("id"))
                type_available = cred_type in available_creds

                if has_id:
                    creds_ok += 1
                elif type_available:
                    creds_fixable += 1
                    issues.append({
                        "severity": "FIXABLE",
                        "node": node.get("name", "?"),
                        "issue": f"Credential '{cred_type}' non liée mais disponible dans n8n",
                        "fix": f"→ n8n_patch_credentials résoudra automatiquement",
                    })
                else:
                    creds_missing += 1
                    issues.append({
                        "severity": "MANUAL",
                        "node": node.get("name", "?"),
                        "issue": f"Credential type '{cred_type}' absente de l'instance n8n",
                        "fix": f"→ Créer '{cred_type}' dans n8n UI d'abord",
                    })

        # --- Check connections ---
        node_names = {n.get("name") for n in nodes}
        for source_name, conns in connections.items():
            if source_name not in node_names:
                issues.append({
                    "severity": "ERROR",
                    "node": source_name,
                    "issue": "Connection source référence un node inexistant",
                    "fix": "Supprimer la connection ou ajouter le node",
                })

        # --- Check for empty/stub nodes ---
        for node in nodes:
            if not node.get("type"):
                issues.append({
                    "severity": "ERROR",
                    "node": node.get("name", "?"),
                    "issue": "Node sans type défini",
                    "fix": "Spécifier le type du node",
                })
            if node.get("type", "").startswith("n8n-nodes-base.noOp"):
                warnings.append({
                    "node": node.get("name", "?"),
                    "warning": "Node NoOp détecté — potentiellement un placeholder",
                })

        # Classification
        if not issues:
            status = "READY"
            verdict = "Workflow prêt à être activé"
        elif creds_missing == 0 and all(i["severity"] == "FIXABLE" for i in issues):
            status = "AUTO_FIXABLE"
            verdict = "Réparable automatiquement avec n8n_patch_credentials"
        elif creds_missing > 0 and creds_fixable > 0:
            status = "PARTIAL_FIX"
            verdict = "Partiellement réparable — certaines credentials à créer manuellement"
        else:
            status = "MANUAL_REQUIRED"
            verdict = "Intervention manuelle requise"

        return {
            "success": True,
            "workflow_name": wf.get("name", "?"),
            "workflow_id": wf.get("id", workflow_id or "?"),
            "status": status,
            "verdict": verdict,
            "stats": {
                "total_nodes": len(nodes),
                "credentials_ok": creds_ok,
                "credentials_fixable": creds_fixable,
                "credentials_missing": creds_missing,
                "total_issues": len(issues),
                "total_warnings": len(warnings),
            },
            "issues": issues,
            "warnings": warnings,
        }

