"""Check the SampleHyperStore data sources in a project through the Metadata API (no VizQL Data Service quota).

Reports, per data source: whether it exists, how many expected columns / calculated fields it has,
how many carry a description, and whether each calculated field's formula matches metadata/rpt_layer.json.

Usage (from data/SampleHyperStore/setup):
    python scripts/check_metadata.py --project "Sandbox/20261121_SampleHyperStore/raw" --layer raw
    python scripts/check_metadata.py --project "Sandbox/20261121_SampleHyperStore/marts" --layer rpt

The Metadata API catalog updates a few minutes after a publish. If counts look short right after
publishing, wait and run it again.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
SETUP = HERE.parent
sys.path.insert(0, str(HERE))

QUERY = """
query($names: [String]) {
  publishedDatasources(filter: {nameWithin: $names}) {
    name luid description
    projectName
    fields {
      __typename name description
      ... on CalculatedField { formula }
    }
  }
}"""


def graphql(server, query: str, variables: dict) -> dict:
    url = f"{server.server_address.rstrip('/')}/api/metadata/graphql"
    req = urllib.request.Request(url, data=json.dumps({"query": query, "variables": variables}).encode(),
                                 headers={"X-Tableau-Auth": server.auth_token, "Content-Type": "application/json",
                                          "Accept": "application/json"})
    with urllib.request.urlopen(req) as r:
        out = json.loads(r.read())
    if out.get("errors"):
        raise SystemExit(f"Metadata API error: {out['errors']}")
    return out["data"]


def norm(s: str | None) -> str:
    return re.sub(r"[\s_]+", "", s or "").lower()


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--project", required=True, help="project path; only its last level is matched")
    ap.add_argument("--layer", choices=["raw", "rpt"], required=True)
    ap.add_argument("--name-format", default="SampleHyperStore - {table}", help="raw names (test runs only)")
    ap.add_argument("--data", help="dataset folder (default: data/SampleHyperStore)")
    ap.add_argument("--prefix", default="rpt_samplehyperstore__", help="rpt_ name prefix (test runs only)")
    a = ap.parse_args()

    from tableau_auth import signed_in_server
    project_name = a.project.rstrip("/").split("/")[-1]
    from publish_raw import dataset_dir
    meta = dataset_dir(a.data) / "setup" / "metadata"
    if a.layer == "raw":
        spec = json.loads((meta / "raw_layer.json").read_text(encoding="utf-8"))
        expected = {a.name_format.format(table=t): {"columns": v["columns"]} for t, v in spec.items()}
    else:
        spec = json.loads((meta / "rpt_layer.json").read_text(encoding="utf-8"))
        expected = {a.prefix + k[len("rpt_samplehyperstore__"):]: {"calcs": v["calculated_fields"]}
                    for k, v in spec.items() if not k.startswith("_")}

    with signed_in_server() as server:
        data = graphql(server, QUERY, {"names": list(expected)})
    got = {d["name"]: d for d in data["publishedDatasources"] if d["projectName"] == project_name}

    ok = True
    for name, exp in expected.items():
        d = got.get(name)
        if not d:
            print(f"[missing] {name}")
            ok = False
            continue
        fields = {f["name"]: f for f in d["fields"]}
        if a.layer == "raw":
            cols = exp["columns"]
            have = [c for c in cols if c in fields]
            described = [c for c in have if (fields[c].get("description") or "").strip() == cols[c]]
            line = f"columns {len(have)}/{len(cols)}, described {len(described)}/{len(cols)}"
            ok &= len(described) == len(cols)
        else:
            calcs = exp["calcs"]
            have = [c for c in calcs if fields.get(c["name"], {}).get("__typename") == "CalculatedField"]
            same = [c for c in have if norm(fields[c["name"]].get("formula")) == norm(c["formula"])]
            described = [c for c in have if (fields[c["name"]].get("description") or "").strip() == c["description"]]
            line = (f"calculated fields {len(have)}/{len(calcs)}, formula match {len(same)}/{len(calcs)}, "
                    f"described {len(described)}/{len(calcs)}")
            ok &= len(same) == len(calcs)
        print(f"[{name}] {line}; data source description {'set' if d.get('description') else 'empty'}")
    print("all present" if ok else "some items are missing (see above)")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
