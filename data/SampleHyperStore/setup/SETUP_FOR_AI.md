# SampleHyperStore setup — instructions for an AI agent

You are helping a user put SampleHyperStore on their own Tableau Cloud site, so that they can ask an AI agent (through Tableau MCP) analysis questions about it. Read this whole file before acting. Work from the folder `data/SampleHyperStore/setup/`.

## What you will build

```
Project A (raw layer)      12 published data sources "SampleHyperStore - <table>", one per CSV,
                           with column display names and column descriptions          <- script
Project B (rpt_ layer)     6 published data sources "rpt_samplehyperstore__<dept>", each composed
                           from raw-layer data sources, with 53 calculated fields      <- user, in the web editor
                           and their descriptions                                     <- script + web editor
Tableau Knowledge (opt.)   a graph over the 18 data sources + 16 Business Preferences <- web UI + Tableau MCP
```

The 12 tables are: products, orders, order_lines, shipments, shipment_lines, returns, refunds, invoices, invoice_lines, credit_memos, web_sessions, web_searches. The other 12 CSVs in `../csv/` are not part of this setup.

## Rules

- **Ask the user before every step that writes to Tableau** (publish, overwrite, Knowledge writes). Say which project and which data sources.
- **Never ask for, or accept, a password or token in chat.** Sign-in happens in the user's browser.
- **Use a new, empty project.** Do not publish over data sources that already exist on the site.
- VizQL Data Service allows about 100 requests per hour per Creator. `query-datasource` and `get-datasource-metadata` both use it. Read metadata with `scripts/check_metadata.py` (Metadata API) and keep queries to the checks below.
- Do not edit `../csv/`. The files are checked against `../SHA256SUMS`.

## Prerequisites (confirm with the user)

| Need | Why |
|---|---|
| Tableau Cloud, Creator role, permission to publish to two projects | publishing |
| Python 3.10+ on the user's machine | scripts |
| Tableau MCP connected to this AI agent | checks, Business Preferences |
| Tableau+ (Knowledge enabled) — optional | step 6 only |
| A person (or a computer-use agent) who can use the Tableau web editor | steps 3 and 4 |

## Step 0. Prepare

1. **Ask the user which edition to set up**, and use it for every script below:

   | Edition | Folder | `--data` | Status |
   |---|---|---|---|
   | English | `data/SampleHyperStore` | (omit) | tested on a fresh project: all 12 raw data sources, and one rpt_ data source (billing) through steps 3–4 |
   | Japanese | `data/SampleHyperStore_jp` | `--data ../../SampleHyperStore_jp` | same structure and numbers; this setup path is untested |

   The Japanese edition has Japanese column names, values, descriptions, calculated-field names and Business Preferences. Data source names stay English. In step 3, read `metadata/rpt_layer.json` from the chosen edition. Tableau Knowledge officially supports English only, so Knowledge results on the Japanese edition may be weaker.
2. `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and fill in `SERVER` and `SITE_NAME` (ask the user for these two values; they are not secret).
4. `python scripts/tableau_auth.py status` — if no session is cached, the first script run opens the browser for sign-in.
5. Create the projects. Ask the user under which existing project to put them (for example a sandbox project), then:

   ```
   python scripts/create_projects.py --parent "<parent project path>"
   ```

   This creates the structure below and prints the two paths you will use. Tableau MCP cannot create projects. If the script is refused (it needs site admin, or project leader on the parent), ask the user to create the same three projects in the web UI.

   ```
   <parent>/
     <yyyymmdd>_SampleHyperStore/
       raw/     12 data sources "SampleHyperStore - <table>"
       marts/   6 data sources "rpt_samplehyperstore__<dept>"
   ```

   Do not put the data sources in a project that already holds other "SampleHyperStore" data sources: an AI agent that lists data sources would see both.

## Step 1. Publish the raw layer (script)

```
python scripts/publish_raw.py --project "<raw project path>" --dry-run   # builds .hyper files only
python scripts/publish_raw.py --project "<raw project path>"
```

For each table the script publishes a .hyper extract, writes display names and descriptions from `metadata/raw_layer.json` into the data source, overwrites it, downloads it again and checks every column. It ends with `done`, or lists tables to look at; details are in `work/raw/report.json`.

Check without spending query quota: `python scripts/check_metadata.py --project "<raw project path>" --layer raw` (Metadata API; the catalog can lag a few minutes behind a publish). Optionally query row counts for two or three data sources with Tableau MCP:

| Data source | Rows | | Data source | Rows |
|---|---:|---|---|---:|
| products | 202 | | invoices | 32,568 |
| orders | 31,281 | | invoice_lines | 68,621 |
| order_lines | 71,007 | | credit_memos | 6,441 |
| shipments | 32,568 | | web_sessions | 455,057 |
| shipment_lines | 68,621 | | web_searches | 100,524 |
| returns | 6,680 | | refunds | 6,493 |

## Step 2. Decide who does the web-editor work

Steps 3 and 4 need the Tableau web editor: composing published data sources is not available through the REST API in a form these scripts can rely on. Ask the user whether they will do it by hand or have a computer-use agent do it. Either way, give them the procedure below for one data source at a time, and wait for them to say it is published.

## Step 3. Compose the six rpt_ data sources (web editor)

Read `metadata/rpt_layer.json`. For each data source:

| rpt_ data source | Base table (root) | Relationships |
|---|---|---|
| rpt_samplehyperstore__billing | invoices | invoices →(Invoice Id) invoice_lines →(Product Id) products; invoice_lines →(Invoice Id and Product Id) credit_memos |
| rpt_samplehyperstore__sales_orders | products | products →(Product Id) order_lines →(Order Id) orders |
| rpt_samplehyperstore__merchandising | products | same as sales_orders |
| rpt_samplehyperstore__shipments | products | products →(Product Id) shipment_lines →(Shipment Id) shipments |
| rpt_samplehyperstore__returns_refunds | returns | returns →(Product Id) products; returns →(Return Id) refunds |
| rpt_samplehyperstore__web_analytics | web_sessions | web_sessions →(Session Id) web_searches |

Procedure for the person at the web editor:

1. New published data source → "On this site" → connect to the root's raw data source (`SampleHyperStore - <root>`). Open the Data Source tab.
2. Add the other raw data sources with "Add published data source", in the order they appear in `parent_tables` in the JSON, skipping the root. The order decides which copy of a duplicated column name gets the " (<table>.csv)" suffix, and some formulas use that suffix (for example `[Order Id (order_lines.csv)]` in sales_orders: connect products, then add orders, then order_lines).
3. **Keep exactly one base table.** Draw each relationship from the "+" at the right edge of a table that is already in the tree to the new table. Never draw from the new table into the tree: that makes it a second base table, and its measures then repeat the grand total when split by the other tables' dimensions.
   - A computer-use agent can draw from the root's "+", but dragging from the "+" of a table further down the tree did not register in our runs. Ask the person to draw those lines by hand.
4. Pick the key fields for each relationship as in the table above. No dashed line or "!" may remain.
5. Add each calculated field from `calculated_fields` in the Scratchpad: data pane menu (▾) → Create Calculated Field → name and formula exactly as written → it must say "The calculation is valid." → OK. **Create them here, in the web editor.** Calculated fields written into the .tds through the REST API are dropped the next time the data source is published from the web editor.
6. Publish → name `rpt_samplehyperstore__<dept>`. **Choose the rpt_ project in the dialog**: it defaults to the root data source's project (the raw one). Leave "embed credentials" off. The data source description defaults to the root's; `describe_rpt.py` in step 4 replaces it with `datasource_description`.

Check after each one: `python scripts/check_metadata.py --project "<marts project path>" --layer rpt` shows the calculated fields and whether each formula matches. (Prefer this to `get-datasource-metadata` in Tableau MCP, which calls VizQL Data Service and counts against the query quota.) Then one query per data source (no dimensions) against these totals:

| Data source | Field | Expected |
|---|---|---:|
| sales_orders | Units | 111,008 |
| merchandising | Units / Order Lines | 115,435 / 71,007 |
| shipments | Units | 110,762 |
| returns_refunds | Requested Units / Received Units / Refunds | 7,944 / 6,704 / 907,537.58 |
| web_analytics | Sessions / Transactions / Units Added to Cart | 455,057 / 24,484 / 191,594 |
| billing | Gross Revenue | 13,347,403.19 |

Then one split check per data source with a product attribute (for example Units by Category). If a measure shows the same value in every category, the data source has two base tables: redo step 3.3.

## Step 4. Describe the calculated fields (script + web editor)

The web editor cannot write field descriptions, and the lineage page is unreliable for it. Use two steps per data source:

1. `python scripts/describe_rpt.py --project "<rpt_ project path>" --datasources billing` — writes the descriptions from `metadata/rpt_layer.json` and overwrites the data source through REST. This drops the composition for a moment.
2. The person at the web editor opens the data source **again from its page** (an editor tab opened before step 1 still holds the old version) → Edit → Publish → same name and project → Overwrite, with no changes. This restores the composition and keeps the descriptions. The first click on Publish sometimes does nothing; click again.

Check: `check_metadata.py --layer rpt` shows the descriptions, and the same totals query as in step 3 returns the same values. If it fails with an error about being connected only to published data sources, step 2 has not been done yet.

## Step 5. Try it

The setup is usable now. Give the user `../docs/questions.md`: 19 of the 40 questions (marked "Tableau setup") can be asked against these six data sources.

## Step 6. Tableau Knowledge (optional, Tableau+)

1. The user creates a knowledge graph in the web UI (a site holds up to 5 graphs): Manage Graphs → New knowledge graph → Published Data Sources → search `samplehyperstore` → select all 18 → create. It does not need to be the primary graph.
2. Find the graph id with `inspect-knowledge-context` (action `status`).
3. For each item in `metadata/business_preferences.json`, call `manage-knowledge-context` with `action: create`, `isGlobal: true`, the graph id, `name` = title, `statements` = [text]. Replace `{{RPT_PROJECT_PATH}}` with the rpt_ project path written as `A > B`. Show the user the 16 items before writing.
4. Check with `inspect-knowledge-context` (action `list`, `isGlobal: true`): 16 items.
5. Knowledge reads field descriptions when a data source is published. Allow about 15 minutes after the last publish before relying on it.

Knowledge is English only. Business Preferences can only be global on this setup (attaching to a field node was refused).

## Known limits

- `get-datasource-metadata` in Tableau MCP may not return field descriptions; Knowledge does.
- Column descriptions on the raw layer are not inherited by the composed rpt_ data sources (as of Tableau 2026.2). The rpt_ layer carries only calculated-field descriptions on purpose.
- The address of a data source page (`.../datasources/<number>`) changes on every overwrite. Open data sources by searching for their name.
