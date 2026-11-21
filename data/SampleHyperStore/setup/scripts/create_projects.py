"""Create the projects for SampleHyperStore: <parent>/<yyyymmdd>_SampleHyperStore/{raw,marts}.

Usage (from data/SampleHyperStore/setup):
    python scripts/create_projects.py --parent "Sandbox"
    python scripts/create_projects.py --parent "Sandbox" --name 20261201_SampleHyperStore

Needs permission to create projects under --parent (site admin, or project leader of the parent).
If it is refused, create the same three projects in the web UI (Explore -> New -> Project).
Prints the two project paths to pass to publish_raw.py and describe_rpt.py.
"""
from __future__ import annotations

import argparse
import datetime as dt
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--parent", required=True, help='existing parent project path, levels separated by "/"')
    ap.add_argument("--name", default=dt.date.today().strftime("%Y%m%d") + "_SampleHyperStore")
    a = ap.parse_args()

    import tableauserverclient as TSC
    from publish_raw import find_project
    from tableau_auth import signed_in_server

    with signed_in_server() as server:
        parent = find_project(server, a.parent)
        existing = list(TSC.Pager(server.projects))

        def ensure(name, parent_id):
            for p in existing:
                if p.name == name and p.parent_id == parent_id:
                    print(f"[exists] {name}")
                    return p
            p = server.projects.create(TSC.ProjectItem(name=name, parent_id=parent_id,
                                                        description="SampleHyperStore (synthetic retail data)"))
            existing.append(p)
            print(f"[created] {name}")
            return p

        top = ensure(a.name, parent.id)
        ensure("raw", top.id)
        ensure("marts", top.id)
    base = f"{a.parent.rstrip('/')}/{a.name}"
    print(f"raw project:   {base}/raw")
    print(f"marts project: {base}/marts")


if __name__ == "__main__":
    main()
