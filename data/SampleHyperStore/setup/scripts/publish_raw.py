"""Publish the SampleHyperStore raw layer: one published data source per CSV, with display names and descriptions.

For each table in setup/metadata/raw_layer.json (12 tables):
  1. Build a .hyper extract from csv/<table>.csv (column types from generator/columns.yaml).
  2. Publish it as "SampleHyperStore - <table>" with the data source description (REST, CreateNew).
  3. Download the published .tdsx, write the column display names and descriptions into its .tds,
     and publish it again over the same data source (Overwrite). The data source keeps its id.
  4. Download it once more and check that every column has its display name and description.

Usage (from data/SampleHyperStore/setup):
    python scripts/publish_raw.py --project "SampleHyperStore/raw" --dry-run
    python scripts/publish_raw.py --project "SampleHyperStore/raw"
    python scripts/publish_raw.py --project "SampleHyperStore/raw" --tables orders order_lines

--project is the path of an existing project, levels separated by "/".
Sign-in: scripts/tableau_auth.py (browser sign-in; .env holds SERVER and SITE_NAME only).
Work files go to setup/work/ (git-ignored).
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
SETUP = HERE.parent
ROOT = SETUP.parent  # data/SampleHyperStore
WORK = SETUP / "work" / "raw"
sys.path.insert(0, str(HERE))


# ----------------------------------------------------------------- inputs
def dataset_dir(path: str | None) -> Path:
    """The dataset folder: data/SampleHyperStore (English, default) or data/SampleHyperStore_jp."""
    return Path(path).resolve() if path else ROOT


def load_inputs(data: Path = ROOT):
    raw = json.loads((data / "setup" / "metadata" / "raw_layer.json").read_text(encoding="utf-8"))
    cfile = data / "columns.yaml" if (data / "columns.yaml").exists() else data / "generator" / "columns.yaml"
    cols = yaml.safe_load(cfile.read_text(encoding="utf-8"))
    return raw, cols


def caption(col: str) -> str:
    return " ".join(w[:1].upper() + w[1:] for w in col.split("_"))


# ----------------------------------------------------------------- 1. hyper
def csv_files(data: Path, table: str) -> list[Path]:
    """csv/<table>.csv, or csv/<table>_<part>.csv when a large table is split (e.g. by year)."""
    one = data / "csv" / f"{table}.csv"
    return [one] if one.exists() else sorted((data / "csv").glob(f"{table}_[0-9]*.csv"))


def build_hyper(table: str, columns: list[list[str]], out: Path, data: Path = ROOT) -> int:
    from tableauhyperapi import (Connection, CreateMode, HyperProcess, SqlType, TableDefinition,
                                 TableName, Telemetry, escape_string_literal)

    def sql_type(t: str):
        if t == "string":
            return SqlType.text()
        if t == "integer":
            return SqlType.big_int()
        if t.startswith("decimal"):
            return SqlType.double()
        if t == "date":
            return SqlType.date()
        if t == "datetime":
            return SqlType.timestamp()
        if t == "boolean":
            return SqlType.bool()
        raise ValueError(f"unknown type {t} in {table}")

    files = csv_files(data, table)
    if not files:
        raise SystemExit(f"{table}: no CSV in {data / 'csv'}")
    for f in files:
        header = f.open(encoding="utf-8").readline().strip().split(",")
        if header != [c[0] for c in columns]:
            raise SystemExit(f"{f.name}: CSV header differs from columns.yaml")
    out.parent.mkdir(parents=True, exist_ok=True)
    tdef = TableDefinition(TableName("Extract", "Extract"),
                           [TableDefinition.Column(c, sql_type(t)) for c, t in columns])
    # keep Hyper's log (it records local paths) in the git-ignored work folder
    with HyperProcess(telemetry=Telemetry.DO_NOT_SEND_USAGE_DATA_TO_TABLEAU,
                      parameters={"log_dir": str(out.parent)}) as hp:
        with Connection(hp.endpoint, out, CreateMode.CREATE_AND_REPLACE) as con:
            con.catalog.create_schema("Extract")
            con.catalog.create_table(tdef)
            n = 0
            for f in files:
                n += con.execute_command(
                    f"COPY {tdef.table_name} FROM {escape_string_literal(str(f))} "
                    "WITH (format csv, header true, NULL '')")
    return n


# ----------------------------------------------------------------- 3. tds edits
def _esc(text: str) -> str:
    return (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace("'", "&apos;").replace('"', "&quot;"))


def _desc_block(text: str) -> str:
    return ("\n    <desc>\n      <formatted-text>\n"
            f"        <run>{_esc(text)}</run>\n"
            "      </formatted-text>\n    </desc>\n  ")


def _metadata(txt: str) -> dict:
    """remote-name -> (local id without brackets, local-type)."""
    out = {}
    for m in re.finditer(r"<metadata-record class='column'>(.*?)</metadata-record>", txt, re.S):
        body = m.group(1)
        rn = re.search(r"<remote-name>(.*?)</remote-name>", body, re.S)
        ln = re.search(r"<local-name>\[(.*?)\]</local-name>", body, re.S)
        lt = re.search(r"<local-type>(.*?)</local-type>", body, re.S)
        if rn and ln:
            out[rn.group(1)] = (ln.group(1), lt.group(1) if lt else "string")
    return out


def name_logical_table(txt: str, table: str) -> str:
    """Name the single logical table "<table>.csv".

    The rpt_ formulas refer to duplicated columns as "<Column> (<table>.csv)"; Tableau builds that
    suffix from the logical table's caption, so it must match the name used on the reference site.
    """
    objs = re.findall(r"<object caption='[^']*' id='[^']*'>", txt)
    if len(set(objs)) != 1:
        raise ValueError(f"expected one logical table, found {len(set(objs))}")
    new = re.sub(r"caption='[^']*'", f"caption='{_esc(table)}.csv'", objs[0], count=1)
    return txt.replace(objs[0], new)


def annotate_tds(txt: str, columns: list[str], descriptions: dict) -> str:
    """Give every column its display name (caption) and description at the data-source level."""
    meta = _metadata(txt)
    for col in columns:
        cap = caption(col)
        if col not in meta:
            raise ValueError(f"column {col} not found in the downloaded .tds")
        local, dtype = meta[col]
        desc = _desc_block(descriptions[cap])
        name_attr = f"name='[{_esc(local)}]'"
        # existing <column ... name='[local]' ...> (self-closing or open)
        m = re.search(r"<column\b[^>]*" + re.escape(name_attr) + r"[^>]*?(/?)>", txt)
        if m:
            tag = m.group(0)
            new_tag = re.sub(r"\s+caption='[^']*'", "", tag)
            new_tag = new_tag.replace("<column", f"<column caption='{_esc(cap)}'", 1)
            if tag.endswith("/>"):
                new = new_tag[:-2].rstrip() + ">" + desc + "</column>"
                txt = txt[:m.start()] + new + txt[m.end():]
            else:
                end = txt.index("</column>", m.end())
                body = re.sub(r"\s*<desc>.*?</desc>", "", txt[m.end():end], flags=re.S)
                txt = txt[:m.start()] + new_tag + desc + body.strip() + "\n  " + txt[end:]
        else:
            role, typ = (("measure", "quantitative") if dtype in ("integer", "real")
                         else ("dimension", "nominal" if dtype in ("string", "boolean") else "ordinal"))
            block = (f"  <column caption='{_esc(cap)}' datatype='{dtype}' {name_attr} "
                     f"role='{role}' type='{typ}'>{desc}</column>\n")
            anchor = "<aliases enabled='yes' />"
            if anchor in txt:
                txt = txt.replace(anchor, anchor + "\n" + block, 1)
            else:
                i = txt.index("</connection>") + len("</connection>")
                txt = txt[:i] + "\n" + block + txt[i:]
    return txt


def read_tdsx(path: Path):
    z = zipfile.ZipFile(path)
    name = next(n for n in z.namelist() if n.endswith(".tds"))
    return z, name, z.read(name).decode("utf-8")


def write_tdsx(z: zipfile.ZipFile, tds_name: str, txt: str, out: Path):
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zo:
        for item in z.infolist():
            data = txt.encode("utf-8") if item.filename == tds_name else z.read(item.filename)
            zo.writestr(item, data)


def check_tds(txt: str, columns: list[str], descriptions: dict) -> list[str]:
    meta = _metadata(txt)
    missing = []
    for col in columns:
        local = meta.get(col, (col, ""))[0]
        m = re.search(r"<column\b[^>]*name='\[" + re.escape(_esc(local)) + r"\]'[^>]*>(.*?)</column>", txt, re.S)
        cap = caption(col)
        if not m or f"caption='{_esc(cap)}'" not in m.group(0) or _esc(descriptions[cap]) not in m.group(1):
            missing.append(cap)
    return missing


# ----------------------------------------------------------------- Tableau
def find_project(server, path: str):
    import tableauserverclient as TSC
    parts = [p for p in path.split("/") if p]
    projects = list(TSC.Pager(server.projects))
    parent = None
    for p in parts:
        hit = [x for x in projects if x.name == p and x.parent_id == (parent.id if parent else None)]
        if not hit:
            raise SystemExit(f"project not found: {path} (create it first)")
        parent = hit[0]
    return parent


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--project", required=True, help='existing project path, e.g. "SampleHyperStore/raw"')
    ap.add_argument("--tables", nargs="*", help="subset of tables (default: all 12)")
    ap.add_argument("--dry-run", action="store_true", help="build the .hyper files only; do not sign in")
    ap.add_argument("--name-format", default="SampleHyperStore - {table}",
                    help='data source name; change it only for a test run (e.g. "SetupTest - {table}")')
    ap.add_argument("--data", help="dataset folder (default: data/SampleHyperStore; the Japanese edition is "
                                   "data/SampleHyperStore_jp)")
    a = ap.parse_args()

    data = dataset_dir(a.data)
    raw, cols = load_inputs(data)
    tables = a.tables or list(raw)
    unknown = [t for t in tables if t not in raw]
    if unknown:
        raise SystemExit(f"not in raw_layer.json: {unknown}")

    hyper = {}
    for t in tables:
        hyper[t] = WORK / t / f"{t}.hyper"
        n = build_hyper(t, cols[t], hyper[t], data)
        print(f"[hyper] {t}: {n:,} rows")
    if a.dry_run:
        print("dry run: nothing published")
        return

    import tableauserverclient as TSC
    from tableau_auth import signed_in_server

    report = {}
    with signed_in_server() as server:
        project = find_project(server, a.project)
        for t in tables:
            spec = raw[t]
            ds_name = a.name_format.format(table=t)
            colnames = [c[0] for c in cols[t]]
            d = WORK / t
            item = TSC.DatasourceItem(project.id, name=ds_name)
            item.description = spec["datasource_description"]
            ds = server.datasources.publish(item, str(hyper[t]), TSC.Server.PublishMode.CreateNew)
            print(f"[publish] {ds_name} -> {ds.id}")

            first = Path(server.datasources.download(ds.id, filepath=str(d / "published")))
            z, tds_name, txt = read_tdsx(first)
            (d / "published.tds").write_text(txt, encoding="utf-8")
            edited = annotate_tds(name_logical_table(txt, t), colnames, spec["columns"])
            (d / "edited.tds").write_text(edited, encoding="utf-8")
            write_tdsx(z, tds_name, edited, d / "edited.tdsx")
            z.close()

            item2 = TSC.DatasourceItem(project.id, name=ds_name)
            item2.description = spec["datasource_description"]
            ds2 = server.datasources.publish(item2, str(d / "edited.tdsx"), TSC.Server.PublishMode.Overwrite)

            back = Path(server.datasources.download(ds2.id, filepath=str(d / "verified"), include_extract=False))
            z3, _, txt3 = read_tdsx(back)
            z3.close()
            missing = check_tds(txt3, colnames, spec["columns"])
            report[t] = {"luid": ds2.id, "same_id": ds2.id == ds.id, "columns": len(colnames),
                         "missing_caption_or_description": missing}
            print(f"[verify] {t}: id kept={ds2.id == ds.id}, columns={len(colnames)}, missing={missing}")
    (WORK / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    bad = [t for t, r in report.items() if r["missing_caption_or_description"] or not r["same_id"]]
    print("done" if not bad else f"check these tables: {bad}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
