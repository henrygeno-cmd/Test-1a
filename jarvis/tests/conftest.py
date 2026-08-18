import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from jarvis.audit.journal import Journal          # noqa: E402
from jarvis.audit.undo import SnapshotStore       # noqa: E402
from jarvis.memory.store import Memory            # noqa: E402
from jarvis.policy.engine import Autonomy, PolicyEngine  # noqa: E402
from jarvis.tools.registry import Registry        # noqa: E402


@pytest.fixture
def registry():
    r = Registry()
    r.discover_package("jarvis.tools")
    return r


@pytest.fixture
def policy(tmp_path):
    return PolicyEngine(
        state_dir=tmp_path / "state",
        default_autonomy={"read": Autonomy.NOTIFY, "files": Autonomy.CONFIRM,
                          "exec": Autonomy.CONFIRM, "secrets": Autonomy.OBSERVE},
        protected_globs=(str(tmp_path / "protected" / "**"),),
    )


@pytest.fixture
def journal(tmp_path):
    return Journal(tmp_path / "journal.ndjson")


@pytest.fixture
def memory(tmp_path):
    return Memory(tmp_path / "mem.db")


@pytest.fixture
def snapshots(tmp_path):
    return SnapshotStore(tmp_path / "snaps")
