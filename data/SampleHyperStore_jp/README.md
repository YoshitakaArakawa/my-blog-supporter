# SampleHyperStore（日本語版）

Tableau で AI によるデータ分析を試すための合成の小売データセット。英語版 [`../SampleHyperStore/`](../SampleHyperStore/) の日本語訳。

Tableau の定番のサンプルデータは、利益と売上の列があらかじめ用意された整った1つのテーブルだ。実際の業務データはそうではない。システムごとに分かれ、同じ言葉が部門によって違う意味を持ち、指標は定義しなければならない。SampleHyperStore はこの状況をあえて再現している。生のテーブルに対して AI エージェントが何を間違えるか、データに説明を付けて指標を定義すると何が変わるかを確かめられる。

## 日本語版について

日本語版は英語版の翻訳で、数値は英語版と同じ。

- 列名と、区分の値・商品名などの文字列の値を日本語にした。数値、日付、日時、ID、コード（州コード、倉庫ID、営業地域ID、会計月など）、true/false は英語版のまま。行の順序も同じ。
- 金額は USD のまま。通貨や単位は換算していない。
- テーブル名とファイル名は英語のまま（`csv/orders.csv` など）。
- 英語と日本語の対応表は `translation/` にある。`build_jp.py` が英語版の CSV からこのフォルダーの CSV を作り、`python build_jp.py --check` で英語版との一致を確かめられる。
- 日本語版を Tableau にセットアップする手順は検証していない。Tableau Knowledge は公式には英語だけに対応している。

## 中身

| フォルダー | 内容 |
|---|---|
| `csv/` | 屋外用品とホーム＆ガーデン用品を扱う架空の米国の小売企業（Web ストア、アプリ、マーケットプレイス、法人）の 24 テーブル。2023-01-01 から 2025-12-31、約 121 MB。チェックサムは `SHA256SUMS`。 |
| `docs/data_dictionary.md` | テーブル、粒度、キー、列。 |
| `docs/questions.md` | AI エージェントに尋ねる 40 の業務の問い。想定する答えは公開していない。 |
| `setup/metadata/` | 12 テーブルを Tableau Cloud に載せるときの、列の説明、53 の計算フィールド、Tableau Knowledge のビジネス設定（日本語）。 |
| `columns.yaml` | 24 の CSV の列の順序と型（日本語の列名）。 |
| `translation/` | 列名と値の英日対応表。 |
| `build_jp.py` | 英語版の CSV から日本語版の CSV を作るスクリプト。 |

データは1つのシミュレーションした世界から作っている。セッションが注文になり、注文が出荷と請求書になり、出荷が返品と返金になる。キーはテーブルをまたいでそろっており、問いで見つけるための業務上の出来事をいくつかデータに仕込んでいる。

## Tableau と AI エージェントで使う

セットアップの手順とスクリプトは英語版の [`../SampleHyperStore/setup/`](../SampleHyperStore/setup/) にある（`SETUP_FOR_AI.md` から読む）。日本語版を使うときは、スクリプトに `--data ../../SampleHyperStore_jp` を付ける。スクリプトはこのフォルダーの `csv/`、`columns.yaml`、`setup/metadata/` を読む。データソース名は英語版と同じ（`SampleHyperStore - <table>`、`rpt_samplehyperstore__<dept>`）。日本語版での動作は検証していない。

セットアップしたら `docs/questions.md` の問いを、説明と Knowledge がある場合とない場合で尋ねて比べる。

## CSV だけで使う

CSV はどのツールでも使える。`docs/data_dictionary.md` から読み始める。CSV を作り直すには、英語版の CSV がある状態で次を実行する。

```
pip install pyyaml
python build_jp.py
```

## ライセンス

データと文書: CC BY 4.0。コード: MIT。`LICENSE-DATA.md` を参照。
