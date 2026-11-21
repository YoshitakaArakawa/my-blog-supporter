"""Write the calculated-field descriptions into an rpt_ data source (step 1 of 2).

The rpt_ data sources are composed from other published data sources. Republishing one through
the REST API without its parent list drops the composition (the data source then answers
"connected only to published data sources" in VizQL Data Service). So this script is step 1:

  1. (this script) download the .tdsx, put the descriptions from setup/metadata/rpt_layer.json on
     the calculated fields, and publish it over the same data source (Overwrite).
  2. (by hand, or with computer use) open the data source in the Tableau web editor and publish it
     again without changes ("Publish" -> keep name and project -> Overwrite). This restores the
     composition and keeps the descriptions.

Usage (from data/SampleHyperStore/setup):
    python scripts/describe_rpt.py --project "SampleHyperStore/marts" --datasources billing shipments
    python scripts/describe_rpt.py --project "SampleHyperStore/marts"            # all six
    python scripts/describe_rpt.py --project "SampleHyperStore/marts" --dry-run  # edit only, no publish
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SETUP = HERE.parent
WORK = SETUP / "work" / "rpt"
sys.path.insert(0, str(HERE))
from publish_raw import _desc_block, _esc, dataset_dir, find_project, read_tdsx, write_tdsx  # noqa: E402

PREFIX = "rpt_samplehyperstore__"


def describe_calcs(txt: str, calcs: list[dict]) -> tuple[str, list[str]]:
    """Set <desc> on each calculated field found by caption. Returns (text, names not found)."""
    missing = []
    for c in calcs:
        cap = _esc(c["name"])
        m = re.search(r"<column\b[^>]*caption='" + re.escape(cap) + r"'[^>]*>(.*?)</column>", txt, re.S)
        if not m or "<calculation " not in m.group(1):
            missing.append(c["name"])
            continue
        body = re.sub(r"\s*<desc>.*?</desc>", "", m.group(1), flags=re.S)
        calc = re.search(r"<calculation [^>]*/>", body).group(0)
        rest = body.replace(calc, "", 1).strip()
        new_body = "\n    " + calc + _desc_block(c["description"]) + (rest + "\n  " if rest else "")
        start = m.start(1)
        txt = txt[:start] + new_body + txt[m.end(1):]
    return txt, missing


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--project", required=True, help="project path that holds the rpt_ data sources")
    ap.add_argument("--datasources", nargs="*", help="short names, e.g. billing shipments (default: all)")
    ap.add_argument("--dry-run", action="store_true", help="download and edit, but do not publish")
    ap.add_argument("--data", help="dataset folder (default: data/SampleHyperStore)")
    ap.add_argument("--prefix", default=PREFIX, help="data source name prefix; change it only for a test run")
    a = ap.parse_args()

    spec = {k[len(PREFIX):]: v for k, v in json.loads((dataset_dir(a.data) / "setup" / "metadata" / "rpt_layer.json").read_text(encoding="utf-8")).items()
            if not k.startswith("_")}
    rpt = {a.prefix + short: v for short, v in spec.items()}
    names = [a.prefix + s for s in a.datasources] if a.datasources else list(rpt)

    import tableauserverclient as TSC
    from tableau_auth import signed_in_server

    with signed_in_server() as server:
        project = find_project(server, a.project)
        opts = TSC.RequestOptions()
        opts.filter.add(TSC.Filter(TSC.RequestOptions.Field.ProjectName, TSC.RequestOptions.Operator.Equals, project.name))
        found = {d.name: d for d in TSC.Pager(server.datasources, opts) if d.project_id == project.id}
        for name in names:
            if name not in found:
                print(f"[skip] {name}: not in project {a.project}")
                continue
            d = WORK / name
            d.mkdir(parents=True, exist_ok=True)
            path = Path(server.datasources.download(found[name].id, filepath=str(d / "original"), include_extract=False))
            z, tds_name, txt = read_tdsx(path)
            (d / "original.tds").write_text(txt, encoding="utf-8")
            edited, missing = describe_calcs(txt, rpt[name]["calculated_fields"])
            (d / "edited.tds").write_text(edited, encoding="utf-8")
            write_tdsx(z, tds_name, edited, d / "edited.tdsx")
            z.close()
            print(f"[edit] {name}: {len(rpt[name]['calculated_fields']) - len(missing)} described, not found: {missing}")
            if a.dry_run or missing:
                continue
            item = TSC.DatasourceItem(project.id, name=name)
            item.description = rpt[name]["datasource_description"]
            pub = server.datasources.publish(item, str(d / "edited.tdsx"), TSC.Server.PublishMode.Overwrite)
            print(f"[publish] {name}: id kept={pub.id == found[name].id}. "
                  "Now republish it once from the web editor without changes (step 2).")


if __name__ == "__main__":
    main()
