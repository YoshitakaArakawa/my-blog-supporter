# 問いのカタログ

SampleHyperStore につないだ AI エージェントに投げる 40 の分析の問い。どれも業務の担当者が尋ねる言い方にしている。想定する答えとよくある間違いは、問いがテストとして使えるように公開していない。

- 相対的な期間の基準日: 利用者は 2025年12月上旬に尋ねている（データは 2025-12-31 まで）。「先月」= 2025年11月、「前四半期」= 暦の 2025年Q3。
- 会計年度は2月1日に始まる（FY2025 = 2025-02-01 .. 2026-01-31）。
- **Tableau セットアップ** = 問いに必要なテーブルがすべて、`setup/` がパブリッシュする 12 テーブルに含まれる。それ以外の問いは、今のところ CSV だけで提供するテーブルを必要とする。

| ID | 範囲 | ドメイン | Tableau セットアップ | Question (EN) | 問い（JA） |
|---|---|---|---|---|---|
| Q01 | 単一ドメイン | Web | yes | For each traffic source, how many sessions did we get last year, and how far do those visitors get — product views, add to cart, checkout, order? | 流入元ごとに、昨年のセッション数と、商品閲覧・カート投入・チェックアウト・注文までどこまで進んだかを見せて。 |
| Q02 | 単一ドメイン | Web | yes | What are customers searching for on our site that we couldn't show in stock? Show me the top search terms by month in 2024. | 2024年に、サイト内検索で在庫ありの商品を出せなかった検索語は何か。月ごとの上位を見せて。 |
| Q04 | 単一ドメイン | マーケティング |  | Which campaigns returned the most revenue per ad dollar last quarter? | 前四半期、広告費1ドルあたりの売上が最も高かったキャンペーンはどれか。 |
| Q06 | 単一ドメイン | マーケティング |  | How many products did we put on promotion each month, in which categories, and how deep were the discounts? | 毎月いくつの商品に販促をかけたか。カテゴリ別と、値引きの深さを見せて。 |
| Q07 | 単一ドメイン | 顧客 |  | How many new customers did we gain each month this year, and from which acquisition sources? | 今年、毎月何人の新規顧客を獲得したか。獲得経路別に見せて。 |
| Q10 | 単一ドメイン | 販売 | yes | Show me monthly sales by channel for the last two years, with year-over-year growth. | 直近2年の販路別の月次売上と、前年比を見せて。 |
| Q11 | 単一ドメイン | 販売 | yes | How much of what customers ordered did we end up cancelling, and why? | 注文された数量のうち、どれだけをキャンセルしたか。理由は何か。 |
| Q15 | 単一ドメイン | フルフィルメント | yes | Are our deliveries arriving late more often this year? Break it down by warehouse and carrier. | 今年は配達の遅れが増えているか。倉庫と配送業者で分けて見せて。 |
| Q17 | 単一ドメイン | フルフィルメント | yes | How often do orders with tents get split into more than one shipment in the West, and did that get worse? | 西部でテントを含む注文が複数の出荷に分かれる頻度はどれくらいで、悪化した時期はあるか。 |
| Q18 | 単一ドメイン | 返品・サポート | yes | What are the main reasons products are returned, by category? | カテゴリ別に、返品の主な理由は何か。 |
| Q20 | 単一ドメイン | 返品・サポート |  | What are customers contacting support about, how fast do we resolve it, and how satisfied are they? | 顧客は何についてサポートに問い合わせているか。解決までの速さと満足度はどうか。 |
| Q22 | 単一ドメイン | 在庫 |  | Where did we run out of stock most in 2024, by warehouse and subcategory? | 2024年に欠品が多かったのは、どの倉庫のどのサブカテゴリか。 |
| Q24 | 単一ドメイン | 調達 |  | Which suppliers deliver late, and how late? | 納期に遅れる仕入先はどこか。どれくらい遅れるか。 |
| Q27 | 単一ドメイン | 財務 | yes | What was our net revenue by fiscal month this year, after returns and marketplace fees? | 今年度の会計月ごとの純売上はいくらか。返品とモール手数料を差し引いて。 |
| Q28 | 単一ドメイン | 財務 |  | How did the sales regions change in January 2025, and which states moved? | 2025年1月に営業地域はどう変わったか。どの州が移ったか。 |
| Q29 | 単一ドメイン | 財務 | yes | How much do marketplace fees eat into our marketplace revenue? | モール手数料は、モール経由の売上をどれだけ削っているか。 |
| Q30 | 複数ドメイン | 調達、在庫、Web、販売 |  | Did we lose tent demand in the West to stockouts in summer 2024? Was it a demand problem or a supply problem? | 2024年夏、西部でテントの需要を欠品で取りこぼしたか。需要の問題か、供給の問題か。 |
| Q32 | 複数ドメイン | Web、販売、在庫 |  | How much demand did we lose to stockouts last year, by subcategory? | 昨年、欠品でどれだけの需要を取りこぼしたか。サブカテゴリ別に。 |
| Q33 | 複数ドメイン | マーケティング、Web |  | What does it cost us to get a visit and an order from each marketing channel? | マーケティングのチャネルごとに、1訪問と1注文を得るのにいくらかかっているか。 |
| Q34 | 複数ドメイン | マーケティング、Web |  | The ad platforms say our campaigns drove a lot of sales. How does that compare with what our own site recorded? | 広告媒体はキャンペーンが多くの売上を生んだと言っている。自社サイトの記録と比べるとどうか。 |
| Q36 | 複数ドメイン | マーケティング、Web、販売、財務 |  | Was our Black Friday 2025 push better than 2024? Look at spend, visits, orders and what we actually billed. | 2025年の Black Friday 施策は2024年より良かったか。広告費、訪問、注文、実際の請求額で見て。 |
| Q37 | 複数ドメイン | 顧客、販売 |  | Which acquisition channels bring customers who come back and buy again? | どの獲得経路から来た顧客が、再び戻って買ってくれるか。 |
| Q39 | 複数ドメイン | マーケティング、販売、在庫 |  | Products we promoted this spring sold less than products we didn't. Did the promotions fail? | この春に販促をかけた商品は、かけなかった商品より売れていない。販促は失敗だったのか。 |
| Q45 | 複数ドメイン | 返品・サポート、フルフィルメント | yes | Did extending the return window to 60 days actually raise our return rate, or just delay returns? | 返品期限を60日に延ばしたことで、返品率そのものが上がったのか。単に返品が遅れて来るようになっただけか。 |
| Q47 | 複数ドメイン | 返品・サポート、財務 | yes | Do Support's refund totals match what Finance booked as returns last quarter? | 前四半期、サポートの返金額と、経理が売上控除として計上した額は一致しているか。 |
| Q48 | 複数ドメイン | Web、マーケティング、販売、商品、財務 |  | What was our revenue last month? | 先月の売上はいくらか。 |
| Q49 | 複数ドメイン | 販売、財務 | yes | Since we launched on the marketplace, how much of our growth is real after fees? | モールに出店して以来、手数料を引いた後でも、伸びは本物か。 |
| Q50 | 複数ドメイン | 財務、販売 | yes | Our finance report and the sales dashboard disagree on October revenue. Why? | 10月の売上が、経理の報告と販売のダッシュボードで合わない。なぜか。 |
| Q51 | 単一ドメイン | 財務 |  | Which sales regions are hitting their target this fiscal year? | 今年度、目標を達成している営業地域はどこか。 |
| Q52 | 単一ドメイン | 財務 | yes | Our West region is down year over year since January. Is business actually worse there? | 1月以降、West 地域が前年割れしている。本当に業績が悪いのか。 |
| Q53 | 複数ドメイン | 財務、販売 |  | How is B2B doing against its regional targets this fiscal year, and which account reps carry each region? | 今年度、法人営業は地域ごとの法人目標に対してどうか。どの担当者がどの地域を支えているか。 |
| Q61 | 複数ドメイン | フルフィルメント、返品・サポート |  | Did the carrier change at the Central warehouse lead to more 'where is my order' calls? | Central 倉庫の配送業者の切り替えで、「荷物はどこか」の問い合わせが増えたか。 |
| Q62 | 単一ドメイン | フルフィルメント | yes | How did on-time delivery change at each warehouse when the primary carrier changed? | 主要配送業者が替わった時、倉庫ごとの定時配達はどう変わったか。 |
| Q63 | 複数ドメイン | フルフィルメント、返品・サポート | yes | Are late deliveries showing up in returns and refunds? | 配達の遅れは、返品や返金に表れているか。 |
| Q64 | 複数ドメイン | 在庫、フルフィルメント、調達、返品・サポート |  | Can I trust the inventory numbers? Do the daily stock movements match what was shipped, received and restocked? | 在庫の数字は信用できるか。日々の在庫の増減は、出荷・入荷・再入庫の記録と合っているか。 |
| Q65 | 複数ドメイン | マーケティング、Web |  | When we send a marketing email, how many visits and orders come back within the next few days? | マーケティングメールを送ると、その後数日でどれだけの訪問と注文が戻ってくるか。 |
| Q66 | 複数ドメイン | 顧客、Web、販売 |  | How many of our active customers shop only on the marketplace, and are any of them coming to our own site? | アクティブな顧客のうち、モールでしか買わない人はどれくらいか。自社サイトに来ている人はいるか。 |
| Q67 | 単一ドメイン | フルフィルメント | yes | What share of orders were delivered after the date we promised the customer? | 顧客に約束した日より後に届いた注文は、どれくらいの割合か。 |
| Q68 | 複数ドメイン | フルフィルメント、販売 | yes | Do customers who received a late delivery buy again less often than those who didn't? | 配達が遅れた顧客は、遅れなかった顧客より再購入が少ないか。 |
| Q70 | 複数ドメイン | 返品・サポート、フルフィルメント | yes | What percentage of each month's orders were eventually returned? | 各月の注文のうち、最終的に返品された割合はどれくらいか。 |

40 問のうち 19 問は、`setup/` がパブリッシュする Tableau のセットアップに対して尋ねられる。
