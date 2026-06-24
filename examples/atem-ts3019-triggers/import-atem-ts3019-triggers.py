#!/usr/bin/env python3
"""Import ATEM-to-TS3019 trigger collection into a Companion v4 SQLite database."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import secrets
import shutil
import sqlite3
from pathlib import Path
from typing import Any


DEFAULT_COLLECTION_LABEL = "ATEM to TS3019"
DEFAULT_ATEM_MODEL_ID = 6


def make_id(prefix: str = "") -> str:
    return prefix + secrets.token_urlsafe(15).replace("-", "_")[:20]


def expr(value: Any, is_expression: bool = False) -> dict[str, Any]:
    return {"value": value, "isExpression": is_expression}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", required=True, type=Path, help="Path to Companion v4 db.sqlite")
    parser.add_argument("--atem-label", default="atem", help="Companion label for the ATEM connection")
    parser.add_argument("--ts3019-label", default="TS3019", help="Companion label for the TS3019 connection")
    parser.add_argument("--lamp-count", default=12, type=int, help="Number of ATEM inputs / TS3019 lamps to map")
    parser.add_argument("--collection-label", default=DEFAULT_COLLECTION_LABEL, help="Trigger collection label")
    parser.add_argument(
        "--atem-model-id",
        default=DEFAULT_ATEM_MODEL_ID,
        type=int,
        help="Offline ATEM model ID used before the ATEM connects. Default: 6 (2 M/E Production 4K)",
    )
    parser.add_argument("--no-set-atem-model", action="store_true", help="Do not update the ATEM model setting")
    parser.add_argument("--dry-run", action="store_true", help="Print planned changes without writing")
    return parser.parse_args()


def load_json(cur: sqlite3.Cursor, table: str, row_id: str) -> dict[str, Any] | None:
    row = cur.execute(f"select value from {table} where id=?", (row_id,)).fetchone()
    return json.loads(row[0]) if row else None


def save_json(cur: sqlite3.Cursor, table: str, row_id: str, value: dict[str, Any]) -> None:
    cur.execute(
        f"insert or replace into {table}(id,value) values(?,?)",
        (row_id, json.dumps(value, separators=(",", ":"))),
    )


def find_instance(cur: sqlite3.Cursor, label: str, module_id: str) -> tuple[str, dict[str, Any]]:
    matches: list[tuple[str, dict[str, Any]]] = []
    for row_id, value in cur.execute("select id,value from instances").fetchall():
        data = json.loads(value)
        if data.get("moduleId") == module_id and data.get("label") == label:
            matches.append((row_id, data))

    if not matches:
        raise SystemExit(f'Could not find Companion connection label "{label}" using module "{module_id}"')
    if len(matches) > 1:
        raise SystemExit(f'Found multiple connections label "{label}" using module "{module_id}"')
    return matches[0]


def find_collection_ids(cur: sqlite3.Cursor, label: str) -> list[str]:
    collection_ids: list[str] = []
    for row_id, value in cur.execute("select id,value from trigger_collections").fetchall():
        data = json.loads(value)
        if data.get("label") == label:
            collection_ids.append(row_id)
    return collection_ids


def max_collection_sort_order(cur: sqlite3.Cursor) -> int:
    max_sort = -1
    for _, value in cur.execute("select id,value from trigger_collections").fetchall():
        try:
            max_sort = max(max_sort, int(json.loads(value).get("sortOrder", 0)))
        except Exception:
            pass
    return max_sort


def delete_collection_triggers(cur: sqlite3.Cursor, collection_ids: list[str]) -> int:
    deleted = 0
    for control_id, value in cur.execute("select id,value from controls where id like 'trigger:%'").fetchall():
        data = json.loads(value)
        if data.get("options", {}).get("collectionId") in collection_ids:
            cur.execute("delete from controls where id=?", (control_id,))
            deleted += 1

    for collection_id in collection_ids:
        cur.execute("delete from trigger_collections where id=?", (collection_id,))

    return deleted


def make_action(ts3019_id: str, lamp: int, state: str) -> dict[str, Any]:
    return {
        "id": make_id(),
        "definitionId": "set_lamp",
        "connectionId": ts3019_id,
        "options": {
            "lamp": expr(lamp),
            "state": expr(state),
            "mode": expr("additive"),
        },
        "upgradeIndex": -1,
        "type": "action",
    }


def make_condition(atem_id: str, feedback_id: str, input_id: int, inverted: bool) -> dict[str, Any]:
    return {
        "id": make_id(),
        "definitionId": feedback_id,
        "connectionId": atem_id,
        "options": {
            "input": expr(input_id),
        },
        "type": "feedback",
        "style": {"color": 16777215, "bgcolor": 16711680 if feedback_id == "program_tally" else 65280},
        "isInverted": expr(inverted),
        "children": {},
    }


def make_trigger(
    collection_id: str,
    ts3019_id: str,
    atem_id: str,
    name: str,
    sort_order: int,
    feedback_id: str,
    input_id: int,
    inverted: bool,
    lamp: int,
    state: str,
) -> dict[str, Any]:
    return {
        "type": "trigger",
        "options": {
            "name": name,
            "enabled": True,
            "sortOrder": sort_order,
            "collectionId": collection_id,
        },
        "actions": [make_action(ts3019_id, lamp, state)],
        "condition": [make_condition(atem_id, feedback_id, input_id, inverted)],
        "events": [{"id": make_id(), "type": "condition_true", "enabled": True, "options": {}}],
        "localVariables": [],
    }


def backup_database(db_path: Path) -> Path:
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_path = db_path.with_name(f"{db_path.name}.before-atem-ts3019-triggers-{stamp}")
    shutil.copy2(db_path, backup_path)
    return backup_path


def main() -> None:
    args = parse_args()
    if args.lamp_count < 1 or args.lamp_count > 12:
        raise SystemExit("--lamp-count must be between 1 and 12")
    if not args.db.exists():
        raise SystemExit(f"Database not found: {args.db}")

    con = sqlite3.connect(args.db)
    cur = con.cursor()

    atem_id, atem = find_instance(cur, args.atem_label, "bmd-atem")
    ts3019_id, ts3019 = find_instance(cur, args.ts3019_label, "avmatrix-ts3019")
    previous_collection_ids = find_collection_ids(cur, args.collection_label)

    print(f"ATEM connection: {args.atem_label} ({atem_id})")
    print(f"TS3019 connection: {args.ts3019_label} ({ts3019_id})")
    print(f"Collection: {args.collection_label}")
    print(f"Triggers to create: {args.lamp_count * 4}")

    if args.dry_run:
        if previous_collection_ids:
            print(f"Would replace existing collection ids: {', '.join(previous_collection_ids)}")
        if not args.no_set_atem_model:
            print(f"Would set ATEM modelID to {args.atem_model_id}")
        print("Dry run only; no changes written.")
        return

    backup_path = backup_database(args.db)
    print(f"Backup created: {backup_path}")

    deleted = delete_collection_triggers(cur, previous_collection_ids)
    if deleted:
        print(f"Deleted {deleted} previous triggers from existing collection.")

    ts3019.setdefault("config", {})
    ts3019["config"].update({"lampCount": args.lamp_count})
    save_json(cur, "instances", ts3019_id, ts3019)

    if not args.no_set_atem_model:
        atem.setdefault("config", {})["modelID"] = args.atem_model_id
        save_json(cur, "instances", atem_id, atem)

    collection_id = make_id("atem_")
    save_json(
        cur,
        "trigger_collections",
        collection_id,
        {
            "id": collection_id,
            "label": args.collection_label,
            "sortOrder": max_collection_sort_order(cur) + 1,
            "children": [],
            "metaData": {"enabled": True},
        },
    )

    sort_order = 0
    created = 0
    for lamp in range(1, args.lamp_count + 1):
        input_id = lamp
        specs = [
            (f"ATEM PGM {input_id} -> L{lamp} red", "program_tally", False, "program"),
            (f"ATEM PGM {input_id} off -> L{lamp} clear red", "program_tally", True, "clear_program"),
            (f"ATEM PVW {input_id} -> L{lamp} green", "preview_tally", False, "preview"),
            (f"ATEM PVW {input_id} off -> L{lamp} clear green", "preview_tally", True, "clear_preview"),
        ]
        for name, feedback_id, inverted, state in specs:
            trigger_id = "trigger:" + make_id()
            save_json(
                cur,
                "controls",
                trigger_id,
                make_trigger(
                    collection_id,
                    ts3019_id,
                    atem_id,
                    name,
                    sort_order,
                    feedback_id,
                    input_id,
                    inverted,
                    lamp,
                    state,
                ),
            )
            sort_order += 1
            created += 1

    con.commit()
    print(f"Created {created} triggers in collection {collection_id}.")
    print("Start Companion again, then open Triggers and check the new collection.")


if __name__ == "__main__":
    main()
