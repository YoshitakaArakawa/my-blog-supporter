# SampleHyperStore

A synthetic retail dataset for trying AI-driven data analysis on Tableau.

Tableau's classic sample data is one tidy table with ready-made profit and sales columns. Real business data is not like that: it is split across systems, the same word means different things in different departments, and the metrics have to be defined. SampleHyperStore reproduces that situation on purpose, so you can see what an AI agent gets wrong on raw tables, and what changes once the data is described and the metrics are defined.

## What is inside

| Folder | Contents |
|---|---|
| `csv/` | 24 tables of a fictional US retailer of outdoor and home & garden goods (web store, app, marketplaces, B2B), 2023-01-01 to 2025-12-31, about 105 MB. Checksums in `SHA256SUMS`. |
| `docs/data_dictionary.md` | Tables, grains, keys and columns. |
| `docs/questions.md` | 40 business questions to ask an AI agent. The intended answers are not published. |
| `setup/` | Everything needed to put 12 of the tables on Tableau Cloud with descriptions, 53 calculated fields and Tableau Knowledge Business Preferences. |
| `generator/` | The code that generates the CSVs (fixed seed, byte-identical output). |

A Japanese edition (Japanese column names, values, descriptions and metadata; identical numbers) is in `../SampleHyperStore_jp/`.

The data is built from one simulated world: sessions turn into orders, orders into shipments and invoices, shipments into returns and refunds. Keys line up across tables, and several business events are planted in the data for the questions to find.

## Use it with Tableau and an AI agent

Open this repository in an AI coding agent that has Tableau MCP connected (for example Claude Code), and say:

> Read `data/SampleHyperStore/setup/SETUP_FOR_AI.md` and set up SampleHyperStore on my Tableau Cloud site.

The agent publishes the raw tables with a script (you sign in through your browser; no token is stored), then guides you, or a computer-use agent, through composing six department data sources in the Tableau web editor. Knowledge (Tableau+) is optional.

Then ask the questions in `docs/questions.md`, with and without the descriptions and Knowledge, and compare.

## Use the CSVs on their own

The CSVs work with any tool. Start from `docs/data_dictionary.md`. To regenerate them:

```
cd generator
pip install -r requirements.txt
python generate.py --check
```

## License

Data and documents: CC BY 4.0. Code: MIT. See `LICENSE-DATA.md`.
