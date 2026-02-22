"""
AINOVA_OS MCP Server - n8n Batch Operations
Script standalone pour trier et patcher les 200+ workflows en batch.

Usage (hors MCP, en CLI):
    export N8N_API_KEY="ta_clé"
    python3 -m tools.n8n.batch_ops diagnose
    python3 -m tools.n8n.batch_ops patch
    python3 -m tools.n8n.batch_ops patch --activate
"""

import asyncio
import json
import sys
from pathlib import Path

import aiohttp

# Resolve imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
from .config import config


async def fetch_all_credentials() -> dict:
    """Récupère la credential map depuis n8n."""
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{config.base_url}/api/v1/credentials",
            headers=config.headers,
        ) as resp:
            data = await resp.json()

    creds = data.get("data", data) if isinstance(data, dict) else data
    cred_map = {}
    for c in creds:
        if c["type"] not in cred_map:
            cred_map[c["type"]] = {"id": c["id"], "name": c["name"]}
    return cred_map


async def fetch_all_workflows() -> list:
    """Récupère tous les workflows depuis n8n."""
    workflows = []
    async with aiohttp.ClientSession() as session:
        cursor = None
        while True:
            params = {"limit": 250}
            if cursor:
                params["cursor"] = cursor
            async with session.get(
                f"{config.base_url}/api/v1/workflows",
                headers=config.headers,
                params=params,
            ) as resp:
                data = await resp.json()

            batch = data.get("data", data) if isinstance(data, dict) else data
            workflows.extend(batch)

            next_cursor = data.get("nextCursor") if isinstance(data, dict) else None
            if not next_cursor or not batch:
                break
            cursor = next_cursor

    return workflows


async def diagnose_all():
    """Diagnostic de tous les workflows — triage en catégories."""
    print("🔍 Récupération des credentials...")
    cred_map = await fetch_all_credentials()
    print(f"   ✅ {len(cred_map)} types de credentials disponibles\n")

    print("📋 Récupération des workflows...")
    workflows = await fetch_all_workflows()
    print(f"   ✅ {len(workflows)} workflows trouvés\n")

    # Catégories
    ready = []       # Aucun problème
    auto_fix = []    # Credentials fixables automatiquement
    partial = []     # Mix de fixable + manquant
    manual = []      # Credentials manquantes
    no_creds = []    # Pas de credentials du tout

    for wf in workflows:
        nodes = wf.get("nodes", [])
        needs_creds = False
        fixable = 0
        missing = 0
        ok = 0
        missing_types = set()

        for node in nodes:
            if "credentials" not in node:
                continue
            needs_creds = True
            for cred_type, cred_ref in node["credentials"].items():
                if cred_ref.get("id"):
                    ok += 1
                elif cred_type in cred_map:
                    fixable += 1
                else:
                    missing += 1
                    missing_types.add(cred_type)

        entry = {
            "id": wf.get("id"),
            "name": wf.get("name", "?"),
            "active": wf.get("active", False),
            "nodes": len(nodes),
            "creds_ok": ok,
            "creds_fixable": fixable,
            "creds_missing": missing,
            "missing_types": list(missing_types),
        }

        if not needs_creds:
            no_creds.append(entry)
        elif missing == 0 and fixable == 0:
            ready.append(entry)
        elif missing == 0 and fixable > 0:
            auto_fix.append(entry)
        elif missing > 0 and fixable > 0:
            partial.append(entry)
        else:
            manual.append(entry)

    # Rapport
    print("=" * 60)
    print("📊 RAPPORT DE TRIAGE")
    print("=" * 60)

    print(f"\n✅ PRÊTS ({len(ready)}) — credentials OK")
    for w in ready[:10]:
        print(f"   {w['id']:>6} | {w['name'][:40]}")
    if len(ready) > 10:
        print(f"   ... et {len(ready) - 10} autres")

    print(f"\n🔧 AUTO-FIXABLE ({len(auto_fix)}) — n8n_patch_credentials résout tout")
    for w in auto_fix[:10]:
        print(f"   {w['id']:>6} | {w['name'][:40]} ({w['creds_fixable']} à patcher)")
    if len(auto_fix) > 10:
        print(f"   ... et {len(auto_fix) - 10} autres")

    print(f"\n⚠️  PARTIELLEMENT FIXABLE ({len(partial)}) — patch + action manuelle")
    for w in partial:
        print(f"   {w['id']:>6} | {w['name'][:40]} (fix:{w['creds_fixable']} miss:{w['creds_missing']})")
        if w["missing_types"]:
            print(f"           → Manquent: {', '.join(w['missing_types'])}")

    print(f"\n❌ MANUELS ({len(manual)}) — credentials à créer dans n8n UI")
    for w in manual:
        print(f"   {w['id']:>6} | {w['name'][:40]}")
        if w["missing_types"]:
            print(f"           → Manquent: {', '.join(w['missing_types'])}")

    print(f"\n⚪ SANS CREDENTIALS ({len(no_creds)}) — pas de credentials nécessaires")

    # Résumé
    total = len(workflows)
    print(f"\n{'=' * 60}")
    print(f"RÉSUMÉ: {total} workflows")
    print(f"  ✅ Prêts:            {len(ready):>4} ({len(ready)*100//max(total,1)}%)")
    print(f"  🔧 Auto-fixable:     {len(auto_fix):>4} ({len(auto_fix)*100//max(total,1)}%)")
    print(f"  ⚠️  Partiel:          {len(partial):>4} ({len(partial)*100//max(total,1)}%)")
    print(f"  ❌ Manuel:            {len(manual):>4} ({len(manual)*100//max(total,1)}%)")
    print(f"  ⚪ Sans creds:        {len(no_creds):>4} ({len(no_creds)*100//max(total,1)}%)")
    print(f"{'=' * 60}")

    # Credentials manquantes globales
    all_missing = set()
    for w in partial + manual:
        all_missing.update(w["missing_types"])
    if all_missing:
        print(f"\n🔑 CREDENTIALS À CRÉER DANS N8N UI ({len(all_missing)}):")
        for ct in sorted(all_missing):
            print(f"   → {ct}")

    return {
        "ready": ready,
        "auto_fix": auto_fix,
        "partial": partial,
        "manual": manual,
        "no_creds": no_creds,
    }


async def patch_all(activate: bool = False):
    """Patche automatiquement tous les workflows AUTO_FIXABLE."""
    print("🔍 Diagnostic préalable...")
    triage = await diagnose_all()

    targets = triage["auto_fix"]
    if not targets:
        print("\n✅ Aucun workflow à patcher automatiquement.")
        return

    print(f"\n🔧 Patching de {len(targets)} workflows...\n")

    cred_map = await fetch_all_credentials()
    patched_count = 0
    errors = []

    async with aiohttp.ClientSession() as session:
        for wf_info in targets:
            wf_id = wf_info["id"]

            # Récupérer le workflow complet
            async with session.get(
                f"{config.base_url}/api/v1/workflows/{wf_id}",
                headers=config.headers,
            ) as resp:
                if resp.status != 200:
                    errors.append(f"{wf_id}: GET failed ({resp.status})")
                    continue
                wf = await resp.json()

            # Patcher les credentials
            changed = False
            for node in wf.get("nodes", []):
                if "credentials" not in node:
                    continue
                for cred_type, cred_ref in node["credentials"].items():
                    if not cred_ref.get("id") and cred_type in cred_map:
                        cred_ref["id"] = cred_map[cred_type]["id"]
                        cred_ref["name"] = cred_map[cred_type]["name"]
                        changed = True

            if not changed:
                continue

            # Mettre à jour le workflow
            update_payload = {
                "nodes": wf["nodes"],
                "connections": wf.get("connections", {}),
                "settings": wf.get("settings", {}),
            }
            if activate:
                update_payload["active"] = True

            async with session.patch(
                f"{config.base_url}/api/v1/workflows/{wf_id}",
                headers=config.headers,
                json=update_payload,
            ) as resp:
                if resp.status == 200:
                    status = "✅ patché" + (" + activé" if activate else "")
                    print(f"   {wf_id} | {wf_info['name'][:40]} — {status}")
                    patched_count += 1
                else:
                    body = await resp.text()
                    errors.append(f"{wf_id}: PATCH failed ({resp.status}): {body[:100]}")
                    print(f"   {wf_id} | {wf_info['name'][:40]} — ❌ erreur")

    print(f"\n{'=' * 60}")
    print(f"✅ {patched_count}/{len(targets)} workflows patchés avec succès")
    if errors:
        print(f"❌ {len(errors)} erreurs:")
        for e in errors:
            print(f"   {e}")


async def main():
    if not config.is_configured:
        print("❌ N8N_API_KEY non définie.")
        print("   export N8N_API_KEY='ta_clé_api'")
        sys.exit(1)

    cmd = sys.argv[1] if len(sys.argv) > 1 else "diagnose"
    activate = "--activate" in sys.argv

    if cmd == "diagnose":
        await diagnose_all()
    elif cmd == "patch":
        await patch_all(activate=activate)
    else:
        print(f"Commande inconnue: {cmd}")
        print("Usage: python3 -m tools.n8n.batch_ops [diagnose|patch] [--activate]")


if __name__ == "__main__":
    asyncio.run(main())
