from __future__ import annotations

import hashlib
import json
from typing import Any

from app.db.db import Database


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical_json(obj: Any) -> bytes:
    return json.dumps(obj, separators=(",", ":"), sort_keys=True, ensure_ascii=False).encode("utf-8")


class Ledger:
    """
    Append-only, hash-chained ledger. Each entry hash commits to:
      sha256(prev_hash + payload_json)
    where prev_hash is the previous entry_hash (or empty for genesis).
    """

    def __init__(self, db: Database):
        self.db = db

    def append(self, payload: dict[str, Any]) -> str:
        prev_hash = self.db.get_last_ledger_hash()
        payload_bytes = canonical_json(payload)
        material = ((prev_hash or "").encode("utf-8")) + b"\n" + payload_bytes
        entry_hash = sha256_hex(material)
        self.db.insert_ledger_entry(prev_hash=prev_hash, entry_hash=entry_hash, payload=payload)
        return entry_hash

    def verify_chain(self) -> tuple[bool, str | None]:
        """
        Returns (ok, first_bad_entry_hash).
        """
        entries = self.db.get_ledger_entries()
        prev = None
        for e in entries:
            payload = json.loads(e["payload_json"])
            payload_bytes = canonical_json(payload)
            material = ((prev or "").encode("utf-8")) + b"\n" + payload_bytes
            expected = sha256_hex(material)
            if expected != e["entry_hash"] or (e["prev_hash"] != prev):
                return False, str(e["entry_hash"])
            prev = str(e["entry_hash"])
        return True, None

