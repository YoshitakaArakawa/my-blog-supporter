"""Build the Japanese edition of SampleHyperStore from the English CSVs.

Reads  ../SampleHyperStore/csv/*.csv, translation/columns.yaml, translation/values.yaml
Writes csv/*.csv (UTF-8, no BOM, LF, same row order, Japanese header), columns.yaml, SHA256SUMS

Only column names and the categorical / free-text values listed in translation/values.yaml change.
IDs, codes, dates, timestamps, numbers and booleans are copied as they are.
A value that is missing from the mapping stops the build.

Usage (from data/SampleHyperStore_jp):
    python build_jp.py           # build, then check
    python build_jp.py --check   # check the existing csv/ against the English edition only
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import sys
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
EN = HERE.parent / "SampleHyperStore"
EN_CSV = EN / "csv"
OUT_CSV = HERE / "csv"

# A file must stay below this size (GitHub warns at 50 MB). A table that exceeds it is split by year.
MAX_BYTES = 50_000_000
SPLIT_BY_YEAR = {"web_sessions": "session_start_date"}


def load_translation():
    cols = yaml.safe_load((HERE / "translation" / "columns.yaml").read_text(encoding="utf-8"))
    vals = yaml.safe_load((HERE / "translation" / "values.yaml").read_text(encoding="utf-8"))
    en_order = yaml.safe_load((EN / "generator" / "columns.yaml").read_text(encoding="utf-8"))
    for t, cl in en_order.items():
        if [[c, ty] for c, ty in cl] != [[c, ty] for c, _, ty in cols.get(t, [])]:
            raise SystemExit(f"{t}: translation/columns.yaml does not match the English column order or types")
    names = [ja for cl in cols.values() for _, ja, _ in cl]
    for ja in names:
        if "_" in ja or " " in ja:
            raise SystemExit(f"Japanese column name must not contain '_' or spaces: {ja}")
    for t, cl in cols.items():
        jas = [ja for _, ja, _ in cl]
        if len(set(jas)) != len(jas):
            raise SystemExit(f"{t}: Japanese column names are not unique")
    by_en = {}
    for cl in cols.values():
        for en, ja, _ in cl:
            if by_en.setdefault(en, ja) != ja:
                raise SystemExit(f"{en} has two Japanese names")
    if len(set(by_en.values())) != len(by_en):
        raise SystemExit("two English columns share one Japanese name")
    for t, cm in vals.items():
        for c, m in cm.items():
            if c not in [en for en, _, _ in cols[t]]:
                raise SystemExit(f"values.yaml: unknown column {t}.{c}")
            if len(set(m.values())) != len(m):
                raise SystemExit(f"values.yaml: {t}.{c} maps two English values to one Japanese value")
            if "" in m or "" in m.values():
                raise SystemExit(f"values.yaml: {t}.{c} maps an empty value")
    return cols, vals


def read_rows(path: Path):
    with path.open(encoding="utf-8", newline="") as f:
        r = csv.reader(f)
        header = next(r)
        return header, list(r)


def to_bytes(header, rows) -> bytes:
    buf = io.StringIO(newline="")
    w = csv.writer(buf, lineterminator="\n")
    w.writerow(header)
    w.writerows(rows)
    return buf.getvalue().encode("utf-8")


def translate_table(table, cl, vals):
    header, rows = read_rows(EN_CSV / f"{table}.csv")
    if header != [en for en, _, _ in cl]:
        raise SystemExit(f"{table}: English CSV header differs from translation/columns.yaml")
    maps = [vals.get(table, {}).get(en) for en, _, _ in cl]
    missing = {}
    out = []
    for row in rows:
        new = list(row)
        for i, m in enumerate(maps):
            if m is None or row[i] == "":
                continue
            ja = m.get(row[i])
            if ja is None:
                missing.setdefault(cl[i][0], set()).add(row[i])
            else:
                new[i] = ja
        out.append(new)
    if missing:
        detail = "; ".join(f"{c}: {sorted(v)[:10]}" for c, v in missing.items())
        raise SystemExit(f"{table}: values missing from translation/values.yaml -> {detail}")
    return [ja for _, ja, _ in cl], out


def output_files(table, cl, header, rows):
    """{file name: (bytes, row count)}. One file per table, or one per year when the table is too large."""
    data = to_bytes(header, rows)
    if len(data) < MAX_BYTES:
        return {f"{table}.csv": (data, len(rows))}
    if table not in SPLIT_BY_YEAR:
        raise SystemExit(f"{table}.csv is {len(data):,} bytes and has no split rule")
    i = [en for en, _, _ in cl].index(SPLIT_BY_YEAR[table])
    years = {}
    for row in rows:
        years.setdefault(row[i][:4], []).append(row)
    files = {f"{table}_{y}.csv": (to_bytes(header, years[y]), len(years[y])) for y in sorted(years)}
    for name, (b, _) in files.items():
        if len(b) >= MAX_BYTES:
            raise SystemExit(f"{name} is still {len(b):,} bytes")
    return files


def write_columns_yaml(cols):
    lines = ["# Column order and types of the 24 CSVs of the Japanese edition (read by the setup scripts).",
             "# Generated by build_jp.py from translation/columns.yaml. Descriptions are in docs/data_dictionary.md."]
    for t, cl in cols.items():
        lines.append(f"{t}:")
        lines += [f"- [{ja}, '{ty}']" for _, ja, ty in cl]
    (HERE / "columns.yaml").write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def write_sums():
    files = sorted(p.name for p in OUT_CSV.glob("*.csv"))
    text = "".join(f"{sha256(OUT_CSV / n)} *{n}\n" for n in files)
    (HERE / "SHA256SUMS").write_text(text, encoding="utf-8", newline="\n")


def build(cols, vals):
    OUT_CSV.mkdir(exist_ok=True)
    expected = set()
    for t, cl in cols.items():
        header, rows = translate_table(t, cl, vals)
        for name, (data, n) in output_files(t, cl, header, rows).items():
            (OUT_CSV / name).write_bytes(data)
            expected.add(name)
            print(f"[build] {name}: {n:,} rows, {len(data):,} bytes")
    for p in OUT_CSV.glob("*.csv"):
        if p.name not in expected:
            p.unlink()
            print(f"[build] removed stale {p.name}")
    write_columns_yaml(cols)
    write_sums()


# ----------------------------------------------------------------- check
def read_jp_table(table):
    single = OUT_CSV / f"{table}.csv"
    parts = [single] if single.exists() else sorted(OUT_CSV.glob(f"{table}_*.csv"))
    if not parts:
        raise SystemExit(f"{table}: no output file")
    header, rows = None, []
    for p in parts:
        h, r = read_rows(p)
        if header is not None and h != header:
            raise SystemExit(f"{p.name}: header differs from the other parts")
        header = h
        rows += r
    return header, rows, [p.name for p in parts]


def check(cols, vals) -> bool:
    ok = True
    total_en = total_jp = 0
    print(f"{'table':<22}{'files':>6}{'rows EN':>10}{'rows JP':>10}{'kept cols':>10}{'translated':>11}  result")
    for t, cl in cols.items():
        en_header, en_rows = read_rows(EN_CSV / f"{t}.csv")
        jp_header, jp_rows, files = read_jp_table(t)
        problems = []
        if jp_header != [ja for _, ja, _ in cl]:
            problems.append("header")
        if len(en_rows) != len(jp_rows):
            problems.append("row count")
        tmaps = vals.get(t, {})
        kept = [i for i, (en, _, _) in enumerate(cl) if en not in tmaps]
        trans = [i for i, (en, _, _) in enumerate(cl) if en in tmaps]
        if not problems:
            # sort parts back into English row order when the table was split
            if len(files) > 1:
                pos = {r[0]: n for n, r in enumerate(en_rows)}
                jp_rows.sort(key=lambda r: pos[r[0]])
            for i in kept:
                if any(a[i] != b[i] for a, b in zip(en_rows, jp_rows)):
                    problems.append(f"kept column {cl[i][0]} differs")
            for i in trans:
                en_col = cl[i][0]
                inverse = {ja: en for en, ja in tmaps[en_col].items()}
                pairs = {}
                for a, b in zip(en_rows, jp_rows):
                    if (a[i] == "") != (b[i] == ""):
                        problems.append(f"{en_col}: empty value moved")
                        break
                    if a[i] and inverse.get(b[i]) != a[i]:
                        problems.append(f"{en_col}: {b[i]!r} does not map back to {a[i]!r}")
                        break
                    pairs.setdefault(b[i], set()).add(a[i])
                if any(len(s) > 1 for s in pairs.values()):
                    problems.append(f"{en_col}: not 1:1")
        total_en += len(en_rows)
        total_jp += len(jp_rows)
        print(f"{t:<22}{len(files):>6}{len(en_rows):>10,}{len(jp_rows):>10,}{len(kept):>10}{len(trans):>11}  "
              + ("ok" if not problems else "; ".join(problems)))
        ok &= not problems
    # file size, encoding, line endings, checksums
    sums = {}
    for line in (HERE / "SHA256SUMS").read_text(encoding="utf-8").splitlines():
        h, name = line.split(" *", 1)
        sums[name] = h
    for p in sorted(OUT_CSV.glob("*.csv")):
        b = p.read_bytes()
        bad = []
        if len(b) >= MAX_BYTES:
            bad.append(f"size {len(b):,}")
        if b.startswith(b"\xef\xbb\xbf"):
            bad.append("BOM")
        if b"\r" in b:
            bad.append("CR")
        if sums.get(p.name) != hashlib.sha256(b).hexdigest():
            bad.append("SHA256SUMS")
        if bad:
            print(f"[file] {p.name}: {', '.join(bad)}")
            ok = False
    if set(sums) != {p.name for p in OUT_CSV.glob("*.csv")}:
        print("[file] SHA256SUMS lists a different set of files")
        ok = False
    print(f"rows: EN {total_en:,} / JP {total_jp:,}; files {len(sums)}")
    print("check: all ok" if ok else "check: FAILED")
    return ok


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--check", action="store_true", help="check the existing output only")
    a = ap.parse_args()
    cols, vals = load_translation()
    if not a.check:
        build(cols, vals)
    sys.exit(0 if check(cols, vals) else 1)


if __name__ == "__main__":
    main()
