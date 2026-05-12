# 参考資料

## 参考記事・ブログ
| タイトル | URL | 概要 | 記事との関連 |
|---|---|---|---|
| BI's Second Unbundling | https://roundup.getdbt.com/p/bis-second-unbundling | Tristan Handy (dbt Labs) によるBIの第二次アンバンドリング論。Claude等のコーディングエージェントがBIのフロントエンドとして台頭し、可視化・セマンティクス・ホスティングがコンポーネント化していくという議論。アイデンティティ層が次の課題として残る | 「Tableau Classic では3つのArchitectの実現が難しい」という議論の業界全体の文脈として参照。Asset-as-Code、ベンダー横断、フロントエンド再構築の発想を補強 |
| Five things I believe about the future of analytics | https://roundup.getdbt.com/p/five-things-i-believe-about-the-future | Tristan Handy による analytics の未来論。①アナリストがテクニカル化 (CLI/IDE移行) ②データ利用が爆発 ③分析エージェントは既に本番稼働 ④エージェントは人間の100倍以上クエリを発行する ⑤ハーネスがレバレッジポイント、という5つの信念。アナリストの仕事はフロントエンドエンジニアに似てくる、と結ぶ | 「AI/Agent側の境界拡張」議論の中核根拠。特に Thing 5 (ハーネス) が、ユーザーが触れた「ハーネスエンジニアリング」の話と直接接続。Thing 1・3・4 は「アナリストがテック側/上流側に押し上げられる」流れの裏付け |
| TC26 Main Keynote (YouTube Live) | https://www.youtube.com/live/yh4rmD9OXyY?si=6WxJaljKUUUEf6wZ | Tableau Conference 2026 の Main Keynote 録画。「Tableau as agentic analytics platform」「3つのArchitect」のコアメッセージが提示された | 記事の出発点。冒頭で参照URLとして提示 |
| Tristan Handy のセッション (TC26) | https://reg.salesforce.com/flow/plus/tc26/sessioncatalog/page/catalog/session/1766152403453001fSLS | 変化を楽しむというマインドセット。記事末尾の「初心者に戻ることを楽しむ」につなげる重要なインスピレーション源 | 締めくくりで「変化への向き合い方」として参照 |
| Xスレッド (TC26 Keynote感想) | https://x.com/yoshi_datavizjp/status/2051994731564171711 | 著者自身がTC26 Day1朝の興奮の中で投稿した感想スレッド。本記事のショートフォーム版 | 本記事はこのスレッドのロングフォーム版・構造化版にあたる |

## 参考資料（ローカル）
| ファイル | 概要 | 記事との関連 |
|---|---|---|
| references/x_thread.md | 著者の TC26 Keynote 感想 X スレッド全文 | 記事のコアメッセージ・トーンの起点。歓迎の姿勢、「Architect」のキーワード化、Tableau Classic だけで完結するのか?という問い、変化を楽しむ姿勢、すべてここに凝縮されている |
| references/claude_chat_thinking.md | Claude との壁打ち全文 (68メッセージ)。Xスレッドの原点となった思考プロセス。A-Dの4論点、Headless 360、Tableau Next、3つの分岐、Builder Gap、Architect Conference 構想までを深掘り | 記事の本論で展開する構造的議論の素材集。Xスレッドでは触れきれなかった「なぜ Tableau Classic では難しいのか」「Headless 360 の思想こそ Architect の本質」「3つの分岐」などを、ここから掘り起こす |
| references/dbt_bis_second_unbundling.md | Tristan Handy の "BI's Second Unbundling" 全文 (2026-05-03 公開) | BIがフロントエンドエンジニアリング化する業界全体の文脈。Tableau の話を「Tableauに閉じない」より広い変化の中に位置付ける補強材料 |
| references/dbt_five_things_about_the_future.md | Tristan Handy の "Five things I believe about the future of analytics" 全文 (2026-04-19 公開) | Thing 5 のハーネス議論、Thing 1 のアナリストのテクニカル化、Thing 4 のエージェント駆動クエリ等、「Architectへの境界拡張」の業界全体側からの根拠として直接引用したい記事 |
| references/attended_sessions.csv | TC26で著者が参加 (or VOD/Broadcastで予定) しているセッション一覧 (25+ セッション) | 「現地で何を見たか」のリアル感を出すために、必要に応じて引用 (例: True to the Core, Devs on Stage, From Workout to Workplace 等) |

## 関連する過去記事（yarakawa.com）
| タイトル | URL | 関連 |
|---|---|---|
| (未調査) GenAI × Tableau 系の過去記事 | https://www.yarakawa.com/ | 過去にも「Tableauユーザーの役割拡張」「Vibe Analytics」「データ可視化のその先」を論じている可能性が高い。執筆時に文体・主張の一貫性のため参照する想定 |
| (未調査) Tableauユーザーの役割・キャリア論系の過去記事 | https://www.yarakawa.com/ | 「3年来言ってきた」と本人が触れているテーマ。過去記事との論旨接続を検討 |
