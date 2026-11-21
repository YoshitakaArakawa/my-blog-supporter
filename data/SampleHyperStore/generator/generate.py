"""Generate the SampleHyperStore CSVs.

Usage (from this folder):
    python generate.py                      # full scale, fixed seed -> ./out
    python generate.py --scale 0.2 --out small
    python generate.py --check              # full scale, then compare with ../SHA256SUMS

The generator writes what it planted (which IDs each event touched) to ./answer_key/.
That file is the answer to the question catalog; it is git-ignored and not distributed.
"""
import argparse
import hashlib
import json
import pathlib
import sys
import time

import yaml

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from gen.sim import World  # noqa: E402
from gen.write import build_tables, load_schema, write_csvs  # noqa: E402


def check(out):
    """Compare the generated CSVs with the published checksums."""
    expected = {}
    for line in (HERE.parent / 'SHA256SUMS').read_text().splitlines():
        digest, name = line.split()
        expected[name.lstrip('*')] = digest
    bad = []
    for name, digest in sorted(expected.items()):
        got = hashlib.sha256((pathlib.Path(out) / name).read_bytes()).hexdigest()
        if got != digest:
            bad.append(name)
    print(f"checksum: {len(expected) - len(bad)}/{len(expected)} match" + (f"; differ: {bad}" if bad else ''))
    return not bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--scale', type=float, default=1.0)
    ap.add_argument('--out', default=str(HERE / 'out'))
    ap.add_argument('--seed', type=int, default=None, help='override the seed in world_spec.yaml')
    ap.add_argument('--check', action='store_true', help='compare the output with ../SHA256SUMS')
    a = ap.parse_args()
    spec = yaml.safe_load(open(HERE / 'world_spec.yaml', encoding='utf-8'))
    if a.seed is not None:
        spec['seed'] = a.seed
    t0 = time.time()
    w = World(spec, scale_factor=a.scale).run()
    t1 = time.time()
    T = build_tables(w)
    cols = load_schema(HERE / 'columns.yaml')
    info = write_csvs(T, cols, a.out)
    t2 = time.time()
    ak = HERE / 'answer_key'
    ak.mkdir(exist_ok=True)
    name = 'truth_raw.json' if (a.scale == 1.0 and a.seed is None) else f'truth_raw_s{a.scale}_seed{a.seed}.json'
    (ak / name).write_text(json.dumps(dict(w.truth), indent=1, default=str))
    for k, v in info.items():
        print(f"{k:22s} {v['rows']:>9,d} rows {v['bytes'] / 1e6:7.2f} MB")
    print(f"sim {t1 - t0:.0f}s write {t2 - t1:.0f}s")
    if a.check:
        sys.exit(0 if check(a.out) else 1)


if __name__ == '__main__':
    main()
