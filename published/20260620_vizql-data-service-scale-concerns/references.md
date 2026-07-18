# 参考資料 — VizQL Data Service の設定・パーミッションと懸念の背景

## この記事を書く背景（著者メモ）

- Tableau の基本的な使い方は、**ワークブック側**でダッシュボード／可視化を作り、集計済み・フィルター済みのデータを人に展開するものだった。
- フィルターロジック・どの列を見せるか（利用可能にするか）は、基本的に**ワークブック側で制御**されていた。利用者は「ワークブックという窓」を通して、集計・フィルター済みのデータを見ることが前提だった。
- VizQL Data Service (VDS) は、そのダッシュボード／ワークブックの**裏側にある published data source に直接クエリできる**機能（embedded/workbook 内データソースは対象外。published 限定）。
- つまり「ワークブックという窓」を経由せずにデータソースを叩ける。さらに **AI エージェント経由**でもクエリできるようになったので、従来ワークブック側に置いていた制御の前提が崩れるのではないか、慎重になるべきではないか、というのがこの記事の出発点。

> 著者が妥当と認める反論（あらかじめ明記）:
> - API Access パーミッションでアクセス制御は可能。
> - 列の削除や行レベルセキュリティ (RLS) を、ワークブックではなく**データソース側に移行**すればよい。

## 記事の焦点と現時点の背骨（著者メモ）

- **対象は中規模〜大規模の Tableau Server**。単一の巨大サイトでも、複数サイトに分割していても、複数の事業/ドメイン領域の利用者に影響する話。
- **焦点は Viewer サイトロールのユーザー**。Viewer は構造上「データソースへ直接アクセスする権限/機能」を持たず、ワークブック越しの閲覧に限定されていた。その Viewer が VDS で（published）データソースを直接クエリしうる、という世界観の変化がテーマ。
- 懸念の核：有効化はサーバー一括（default on）で、サイト/ドメイン単位の安全弁が無い。全ドメインの移行・合意を取る前に経路が生まれうる。「集計済みサマリーだけを人に見せる」前提で機密データを運用してきた領域に効く。
- 焦点から外す論点（合意済み）:
  - サービスアカウント×RLS の噛み合わせ（論点3）。エージェントはユーザーの PAT もしくはユーザー紐づけ OAuth で認証する想定なので、一旦無視。
  - embedded データソース（VDS は published 専用なので対象外）。
  - 監査ログ（残る想定だが今回の主眼ではない）。

## 執筆動機（記事のスタンス＝礼賛と懸念の両立）

この記事は「VDS は危ない」ではなく「**VDS は素晴らしい。だから安全なペースで広げられる制御を足してほしい**」という建設的提案。

- **礼賛（前提）**: VDS は Tableau が Agentic Analytics Platform であるための重要機能。Tableau MCP 等を通した Agentic Analytics ユースケースはこの機能に大きく依存する。Headless な分析体験に寄与し、Viewer にも自然言語というアクセシブルかつ柔軟な方法でアドホック分析の自由な機会を与える。
- **懸念（本題）**: 有効化が**サーバー単位**で影響範囲が広い。すべての Tableau データソースがこの機能に対して準備できているわけではない。使い手・データソース管理者・ワークブック作成者の学習も要る。すべてのユーザーが MCP 経由の分析体験を受け入れる準備ができているわけでもない。
- **提案**: まず一部で成功体験を作るために、**サイト単位での有効化**が許可されれば、ある程度の規模で動く Tableau Server ユーザーでも展開を検討しやすい（Prep Conductor と同型のサイトトグル）。
- **CTA**: 賛同する Tableau ユーザーは、担当の Tableau 中の人にもこの懸念を挙げてみてほしい（当面は担当者ルートに絞る。Tableau Community Ideas での正式要望化は後から検討）。

### 礼賛と懸念の和解点（記事の背骨）
礼賛も懸念も**同一の capability**を指す。矛盾に見せないため、和解点を明示する: 求めているのは機能の制限ではなく、**組織が安全な速度で採用するための移行制御**。「データソースが準備でき、関係ユーザーが学習し、ユーザーが MCP 体験を受け入れる準備が整う」ための時間を、サイトトグルが買う＝採用を促進する要求。

### 想定反論への備え（最重要）
反論「API Access が資産ごとにある（既定 unspecified＝実効拒否）。VDS 有効化だけでは何も露出しない。なぜサイトトグルが要る？」への返し:
1. 粒度の種類が違う。API Access は資産ごとの fine-grained **allow**。提案は site/ドメイン単位の粗い **deny（キルスイッチ）**。defense in depth は両方を要する。
2. 負担の反転/ブラスト半径。サーバー一括 default on は「全 data source を準備し終えるまで安全に有効化できない」を強制。サイトトグルは準備済みから順にペースを区切れる。
3. 誤付与の同時多発（テンプレ/All Users/一括操作で API Access が許可に化ける）をサーバー有効化が全サイト同時に開きうる。site バックストップで局所化。
4. 正直に認める: 今日でも「サイト/プロジェクト既定で API Access 全否定」で擬似 site deny は作れる。ただし opt-out・手作業・継続管理・単一監査スイッチでない。だから Prep Conductor 同型の first-class なサイトトグルを求めるのは妥当。

---

## 調査結果（公式ドキュメント裏取り）

### 1. 有効化はサーバー単位（TSM）— サイト単位ではない【一次ソース確認済み】

VDS の有効/無効は **TSM（Tableau Services Manager）経由のサーバー設定**。設定キーは `features.VizqlDataServiceDeployWithTsm`、**デフォルト `true`（有効）**。

公式定義（cli configuration set Options）原文:
> "Controls whether the Vizql Data Service is enabled. When enabled (the default), the service exposes VizQL Data Service HTTP endpoints for users to programmatically interact with."

無効化手順（Tableau Server VizQL Data Service ページ）— プロセス数を 0 にしてからキーを false にし、保留中の変更を適用:

```
tsm topology set-process --count 0 --process vizqldataservice --node <nodeName>
tsm configuration set -k features.VizqlDataServiceDeployWithTsm -v false
tsm pending-changes apply
```

**サーバー単位である根拠**: TSM はサーバー／ノード（トポロジ）を管理する仕組みで、`--node <nodeName>` 単位で `vizqldataservice` プロセス数を制御する。サイト管理者がサイト設定で切り替える項目ではない。
→ 「サーバー単位でサイト単位ではない」という著者の認識は公式と整合。

**対比【一次ソース確認済み】**: Tableau の標準パターンは「サーバーで有効化 → サイト単位で絞る」。VDS だけこの site 粒度が無い。
- Tableau Prep Conductor 原文: "When you activate Tableau Prep Conductor using the Data Management product key, Tableau Prep Conductor is enabled for the entire Tableau Server installation. You can further modify and customize the setting for sites." / "If you have multiple sites, you can selectively turn off Tableau Prep for Server for individual sites."（サイト設定のチェックボックス "Allow users to schedule and monitor flows" で site 単位オフ可能）
- Web Authoring（Flows）も Site → Settings → Web Authoring で site 単位トグル。
- → VDS は「サーバー一括の TSM のみ、site 単位の絞りが無い」点で Tableau 自身の標準パターンから外れる。マルチサイト＝マルチドメインで統制してきた前提と正面衝突する、検証可能な柱。
- なお VDS に site 単位トグルが「無い」こと自体は消極的確認（TSM 以外のリファレンスが出てこない）。
- Cloud の事情【検索集約・要最終pin】: Cloud は TSM が無いためサービス自体の無効化手段が無く、制御は資産ごとの API Access のみ。API Access は既定で未付与＝deny（"off by default in Cloud"）。→ **Server＝粗い OFF のみ（サイト粒度なし）／Cloud＝細かい制御のみ（粗い OFF なし）／両者とも「サイト単位」の中間粒度が無い**。これが章3〜4の核。原文 pin は Cloud blog "How to Use VDS in Your Tableau Cloud Site"（WebFetch 403）で未了、著者が確認予定。「Cloud は野放し」は誤り（既定 deny）。

### 2. VDS は published data source 専用【一次ソース確認済み】

VDS Introduction 原文:
> "VDS only works with published data sources."

→ embedded（ワークブック内）データソースは対象外。確認点として除外。

### 3. 「API Access」パーミッション — 機能を"使う"側の制御【一次ソース確認済み】

機能を使う側の制御は、サーバー設定ではなく**データソース／ワークブックのパーミッション capability「API Access」**。

- Permission Capabilities and Templates（capability 定義の正本）原文:
  - Data Sources: "API Access lets a user query the data source with the VizQL Data Service."
  - Workbooks: "API Access lets a user query the workbook's data source with the VizQL Data Service."
  - いずれも **Publish テンプレート**に属する capability（Data Sources の Publish: Overwrite / **API Access** / Create Metric Definitions）。
- VDS Configuration ページ（使う前提条件として明記）原文:
  > "To query a data source with VizQL Data Service (VDS), you must first assign the **API Access** capability in the **Permission** dialog."

### 4. Viewer サイトロールと API Access の関係【決め手・一次ソース＋強い推論】

Permissions, Site Roles, and Licenses 原文の含意:
> "a user with a site role of Viewer will never be able to download a data source even if that capability is explicitly granted to them on a specific data source."

- Viewer が**明示付与されても持てない** capability（サイトロール上限で恒久的に不可）に、`Download Full Data` / `Download Data Source` / `Web Edit` / `Overwrite` 等が含まれる。Viewer がデータソースに保持できるのは `View` と `Connect`（read-only）のみ。
- **その禁止リストに `API Access` は含まれていない。** API Access は Data Sources の Publish テンプレート capability で、Viewer 上限の禁止対象に該当しない。

→ **論理的に entail される（単一の明文は無いが、挙動から帰結）**: **API Access は Viewer に付与すると実効になる＝Viewer が published data source を VDS で直接クエリできる**。これは「Download Full Data を Viewer に付与しても無効」という従来の構造的ガードを**すり抜ける新種の権限**。
  - 決め手の論証（permission check の挙動から）【一次ソース pin 済み】: 設定キー `features.VizqlDataServicePermission`（tsm configuration set Options）原文 "Turning off the permission flag will disable the permission check and all site roles (except unlicensed) can access the VizQL Data Service APIs." もし Viewer がサイトロール上限で**構造的に**塞がれているなら、チェックを切っても Viewer はアクセスできないはず。だが公式はチェックオフで全 site role（Viewer 含む）がアクセスできると述べる → **Viewer はサイトロール層で塞がれていない**。チェック ON（既定）時の唯一のゲートは API Access capability。
  - 要件の整合: VDS のフルアクセスには data source の **View + Connect + API Access** が必要。Viewer はこの3つすべてを持てる（View/Connect は Viewer が保持、API Access は禁止リストに無い）。3つとも site-role 上限に抵触しない。
  - 「VDS は追加ライセンス不要」も Viewer が想定消費者に含まれることを示唆。
  - 残差: 「Viewer can use VDS」の**単一の明示文**は未発見。また上記 pin は check-off 時の挙動の記述で、「default（check-on）で Viewer＋API Access なら通る」を一文で言い切った公式も未発見。記事では断定を維持しつつ脚注に `features.VizqlDataServicePermission` の一文を根拠として置くのが最善（推論ではなく公式の一文に乗せられる）。実機確認は著者判断で不要。
  - 出典 pin 状況: permission flag の正式キー名＝`features.VizqlDataServicePermission`（pin 済み・tsm configuration set Options）。「View+Connect+API Access でフルアクセス」「追加ライセンス不要」は検索集約どまりで、原文ページ（Cloud blog "How to Use VDS in Your Tableau Cloud Site" が有力だが WebFetch 403）の最終 pin は未了。

### 5. クエリは「データソース層」に効く ＝ workbook 統制は最初から経由しない【焦点 (a)】

本記事の焦点は **(a) Viewer が published data source を API Access で直接クエリする経路**。直接クエリには **workbook がそもそも介在しない**ので、「workbook の集計・列制御・シートフィルターが効かない」は迂回ですらなく自明（最初から通らない）。VDS が尊重するのはデータソース層の統制（データソースフィルター＋データソース実装の RLS）だけ。

- 反論の妥当性もここで同時に立つ: 列削除・RLS を**データソース側に実装していれば**効く。だから「データソース側に移行すればよい」は正しい——が、それを全ドメインが移行し終えるまで安全に有効化できない、という順序/運用問題が残る（§4・背骨参照）。

参考（焦点外）: **FDQ = Full Data Query** は (b) workbook 経由ルートで API Access と組んで使う pass-through capability（`Download Full Data` とは別物）。本記事は (a) に絞るので深追いしない。

### 要追加裏取り（未確認 / 要pin）

- permission flag（API Access チェック自体の無効化）の正式名・既定値・挙動（「切ると全 site role がアクセス可」）。
- capability のデフォルトが unspecified（空白＝実効的に拒否）である旨の VDS 文脈での明文。Tableau の権限モデル上、capability は rule/テンプレートで付与しない限り unspecified が既定。Publish テンプレート適用で API Access が許可に化ける点に注意。
- All Users グループの API Access は None 推奨（ベストプラクティス）の一次ソース。
- Prep Conductor のサイト単位トグル（§1 の対比論拠）。
- Viewer＋API Access の実機クエリ成立（§4 の実証）。

---

## Sources（公式）

- tsm configuration set Options: https://help.tableau.com/current/server/en-us/cli_configuration-set_tsm.htm
- Tableau Server VizQL Data Service: https://help.tableau.com/current/server/en-us/server_process_vizql-data-service.htm
- VizQL Data Service Introduction: https://help.tableau.com/current/api/vizql-data-service/en-us/index.html
- VizQL Data Service Configuration: https://help.tableau.com/current/api/vizql-data-service/en-us/docs/vds_configuration.html
- VizQL Data Service What's New: https://help.tableau.com/current/api/vizql-data-service/en-us/docs/vds_whats_new.html
- Permission Capabilities and Templates: https://help.tableau.com/current/server/en-us/permissions_capabilities.htm
- Permissions, Site Roles, and Licenses: https://help.tableau.com/current/server/en-us/permission_license_siterole.htm
- Set Users' Site Roles: https://help.tableau.com/current/server/en-us/users_site_roles.htm
