# Data dictionary

SampleHyperStore: a fictional US retailer of outdoor and home & garden goods, selling through its own web store, app, third-party marketplaces and B2B. 24 tables, one CSV each, covering 2023-01-01 to 2025-12-31. All names, places and numbers are synthetic.

Columns marked **Tableau** are in the 12 tables that `setup/` publishes to Tableau Cloud. The other 12 are provided as CSV only.

## Tables

| Table | Domain | Grain | Rows | Tableau |
|---|---|---|---:|---|
| [`web_searches`](#web_searches) | web | One row per on-site search executed | 100,524 | yes |
| [`web_sessions`](#web_sessions) | web | One row per web or app session (direct channels only; marketplace and b2b orders have no session) | 455,057 | yes |
| [`campaign_daily`](#campaign_daily) | marketing | One row per campaign x day with delivery | 9,295 |  |
| [`campaigns`](#campaigns) | marketing | One row per marketing campaign | 82 |  |
| [`promotion_products`](#promotion_products) | marketing | One row per promotion x product for product-scoped promotions | 821 |  |
| [`promotions`](#promotions) | marketing | One row per promotion (coupon code or automatic discount) | 59 |  |
| [`customers`](#customers) | customer | One row per customer record | 16,008 |  |
| [`order_lines`](#order_lines) | sales | One row per order x product (one line per SKU in an order) | 71,007 | yes |
| [`orders`](#orders) | sales | One row per order (checkout confirmation, marketplace order import, or B2B order entry) | 31,281 | yes |
| [`products`](#products) | product | One row per SKU | 202 | yes |
| [`shipment_lines`](#shipment_lines) | fulfillment | One row per shipment x order line | 68,621 | yes |
| [`shipments`](#shipments) | fulfillment | One row per shipment (one parcel group leaving one warehouse with one carrier) | 32,568 | yes |
| [`refunds`](#refunds) | support | One row per refund payment issued to a customer | 6,493 | yes |
| [`returns`](#returns) | support | One row per return authorization line (one order line returned once; a line may be returned in more than one authorization) | 6,680 | yes |
| [`support_tickets`](#support_tickets) | support | One row per customer contact case | 6,587 |  |
| [`inventory_daily`](#inventory_daily) | inventory | One row per date x warehouse x SKU, end-of-day snapshot plus that day's movements | 575,899 |  |
| [`purchase_order_lines`](#purchase_order_lines) | procurement | One row per PO x SKU | 13,044 |  |
| [`purchase_orders`](#purchase_orders) | procurement | One row per purchase order (one supplier, one destination warehouse) | 5,837 |  |
| [`receipts`](#receipts) | procurement | One row per receipt (one delivery of one PO line) | 13,766 |  |
| [`suppliers`](#suppliers) | procurement | One row per supplier | 20 |  |
| [`credit_memos`](#credit_memos) | finance | One row per credit memo line (revenue reversal posted by Finance) | 6,441 | yes |
| [`invoice_lines`](#invoice_lines) | finance | One row per invoice x order line | 68,621 | yes |
| [`invoices`](#invoices) | finance | One row per invoice (one invoice per shipment; revenue recognition event) | 32,568 | yes |
| [`sales_targets`](#sales_targets) | finance | One row per sales region x channel x fiscal month | 584 |  |

Keys are shared across domains: `product_id`, `customer_id`, `order_id`, `order_line_id`, `shipment_id`, `invoice_id`, `return_id` and so on. Dates are ISO `YYYY-MM-DD`; timestamps are `YYYY-MM-DD HH:MM:SS`. Amounts are USD.

## web_searches

Site and app searches: query, number of results, how many were in stock at the visitor's serving warehouse, and the first clicked result.

- File: `csv/web_searches.csv` (100,524 rows)
- Grain: One row per on-site search executed
- Primary key: `search_id`
- Owner (fictional department): Digital Marketing

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `search_id` | string |  | pk | Search identifier (group-internal). |
| `session_id` | string |  | → web_sessions.session_id | Session in which the search ran. |
| `searched_at` | datetime |  |  | Search timestamp. |
| `searched_date` | date |  |  | Date part of searched_at. |
| `query_text` | string |  |  | Search query as normalized by the search engine (lowercase, trimmed). |
| `search_input_type` | string |  |  | How the query was entered. Values: typed, autocomplete, suggested_after_no_results. |
| `results_count` | integer |  |  | Number of active products matching the query, regardless of stock. |
| `results_in_stock_count` | integer |  |  | Of results_count, products shown as in_stock or low_stock at the visitor's serving warehouse. |
| `clicked_product_id` | string | yes | → products.product_id | First product clicked from the results. Null if no click. |
| `clicked_result_position` | integer | yes |  | 1-based rank of clicked_product_id in the result list. |

## web_sessions

Sessions recorded by the web/app analytics tool: when, from where, on which device, who (if identified), how far into the funnel, and which order (if any) completed in the session.

- File: `csv/web_sessions.csv` (455,057 rows)
- Grain: One row per web or app session (direct channels only; marketplace and b2b orders have no session)
- Primary key: `session_id`
- Owner (fictional department): Digital Marketing

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `session_id` | string |  | pk | Session identifier issued by the analytics tool. |
| `visitor_id` | string |  |  | Anonymous device/browser identifier (cookie or app install). Group-internal key; one visitor can have many sessions and, after login, map to one customer_id. |
| `customer_id` | string | yes | → customers.customer_id | Customer identified during the session. Null for anonymous sessions. |
| `session_start_date` | date |  |  | Date part of session_start_at. Use this for daily aggregation. |
| `channel` | string |  |  | Sales channel the session belongs to (shared code with orders.channel; only direct channels appear here). Values: web, app. |
| `device_type` | string |  |  | Device category reported by the analytics tool. Values: desktop, mobile, tablet. |
| `state_code` | string |  |  | US state estimated from the visitor IP by the analytics tool (2-letter code, incl. DC). |
| `traffic_source` | string |  |  | Acquisition source of the session (last non-direct click rule of the analytics tool). Values: direct, organic_search, paid_search, paid_social, organic_social, display, email, affiliate, referral, push_notification. |
| `campaign_id` | string | yes | → campaigns.campaign_id | Campaign attributed to the session from tracking parameters. Null for organic, direct, referral. |
| `landing_page_type` | string |  |  | Type of the first page of the session. Values: home, category, product, search, promotion, content, cart. |
| `page_views` | integer |  |  | Number of pageviews / app screen views recorded in the session. |
| `product_views` | integer |  |  | Product detail pages viewed in the session. |
| `oos_product_views` | integer |  |  | Product detail pages viewed while the product was shown as out of stock for the visitor's fulfillment warehouse. |
| `cart_added_date` | date | yes |  | Date of the first add-to-cart in the session. Null if nothing was added. |
| `qty_added_to_cart` | integer |  |  | Units added to cart during the session (removals not subtracted). |
| `checkout_started_date` | date | yes |  | Date checkout was started. Null if the session never reached checkout. |
| `order_id` | string | yes | → orders.order_id | Order completed in this session. Null when no order. Mirrors orders.session_id. |
| `tracked_order_amount` | decimal(12,2) | yes |  | Transaction value recorded by the analytics tool at the moment of purchase (merchandise after discounts, plus shipping and tax). Null when no order. Reported by an external system (not recomputed here). |

## campaign_daily

Daily delivery and cost as reported by each platform: impressions, clicks, email funnel counts, spend, and the platform's own conversions and conversion value.

- File: `csv/campaign_daily.csv` (9,295 rows)
- Grain: One row per campaign x day with delivery
- Primary key: `campaign_id`, `report_date`
- Owner (fictional department): Marketing

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `campaign_id` | string |  | → campaigns.campaign_id | Campaign. |
| `report_date` | date |  |  | Reporting day in the platform's account time zone. |
| `impressions` | integer |  |  | Ad impressions (0 for email and push). |
| `clicks` | integer |  |  | Clicks reported by the platform (for email and push: unique clicks). |
| `emails_sent` | integer | yes |  | Messages sent (email and push only; null otherwise). |
| `emails_delivered` | integer | yes |  | Messages delivered (email and push only). |
| `emails_opened` | integer | yes |  | Unique opens (email and push only). |
| `unsubscribes` | integer | yes |  | Unsubscribes attributed to the send (email and push only). |
| `spend_amount` | decimal(12,2) |  |  | Cost billed by the platform for the day (USD). |
| `platform_conversions` | integer |  |  | Purchases the platform attributes to the campaign under its attribution_window, credited to the click/impression date. Reported by an external system (not recomputed here). |
| `platform_conversion_value_amount` | decimal(12,2) |  |  | Purchase value the platform attributes to the campaign (as sent by the site tag: order total incl. tax and shipping). Reported by an external system (not recomputed here). |

## campaigns

Campaign master: paid media, email, push, affiliate and marketplace-ad campaigns with their channel, platform, objective, audience, period, planned budget and the attribution window the platform uses.

- File: `csv/campaigns.csv` (82 rows)
- Grain: One row per marketing campaign
- Primary key: `campaign_id`
- Owner (fictional department): Marketing

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `campaign_id` | string |  | pk | Campaign identifier. |
| `campaign_name` | string |  |  | Internal campaign name (theme-season-channel). |
| `marketing_channel` | string |  |  | Media channel of the campaign. Matches web_sessions.traffic_source for site-driving channels; marketplace_ads drives marketplace orders and produces no sessions. Values: paid_search, paid_social, display, email, push_notification, affiliate, marketplace_ads. |
| `ad_platform` | string |  |  | Generic code of the platform that delivers and reports the campaign. Values: search_engine_a, search_engine_b, social_network_a, social_network_b, display_network_a, email_service, app_push_service, affiliate_network_a, marketplace_ads_console. |
| `objective` | string |  |  | Optimization objective set on the platform. Values: awareness, traffic, conversion, retention, reactivation. |
| `audience_type` | string |  |  | Targeted audience. Values: prospecting, retargeting, existing_customers, lapsed_customers, all_subscribers. |
| `theme` | string |  |  | Merchandising theme promoted (campaign's own code, not a product category key). Values: sitewide, camping, heating, garden, apparel, black_friday, new_arrivals, clearance. |
| `promotion_id` | string | yes | → promotions.promotion_id | Promotion advertised by the campaign, if any. |
| `start_date` | date |  |  | Planned first day of delivery. |
| `end_date` | date | yes |  | Planned last day of delivery. Null for always-on campaigns. |
| `budget_amount` | decimal(12,2) | yes |  | Planned total budget for the campaign period (plan input, not actual spend). Null for always-on campaigns, which are budgeted monthly outside this table. |
| `cost_model` | string |  |  | How the platform charges. Values: cpc, cpm, per_send, commission, flat_fee. |
| `attribution_window` | string |  |  | Attribution window the platform applies when reporting conversions in campaign_daily. Values: none, 1d_click, 7d_click, 7d_click_1d_view, 30d_click, 30d_click_open. Reported by an external system (not recomputed here). |
| `managed_by` | string |  |  | Who operates the campaign. Values: in_house, agency. |

## promotion_products

Products covered by product-scoped promotions, with any per-product override and whether the product was featured in creatives.

- File: `csv/promotion_products.csv` (821 rows)
- Grain: One row per promotion x product for product-scoped promotions
- Primary key: `promotion_id`, `product_id`
- Owner (fictional department): Marketing

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `promotion_id` | string |  | → promotions.promotion_id | Promotion. |
| `product_id` | string |  | → products.product_id | Product covered. |
| `unit_promo_price` | decimal(12,2) | yes |  | Fixed promotional price for fixed_price promotions. Null for other types (use promotions.discount_percent / discount_amount). |
| `is_featured` | boolean |  |  | Product appeared in the campaign creatives or banner. |
| `added_date` | date |  |  | Day the product was added to the promotion (can be after promotions.start_date). |

## promotions

Promotion master: type, discount parameters, thresholds, eligibility, channels and validity period. Applied promotions are recorded on orders / order_lines (group T).

- File: `csv/promotions.csv` (59 rows)
- Grain: One row per promotion (coupon code or automatic discount)
- Primary key: `promotion_id`
- Owner (fictional department): Marketing

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `promotion_id` | string |  | pk | Promotion identifier. |
| `promotion_name` | string |  |  | Internal name. |
| `promotion_code` | string | yes |  | Coupon code customers enter. Null for automatic promotions. |
| `promotion_type` | string |  |  | Kind of benefit. Values: percent_off, amount_off, fixed_price, free_shipping, buy_x_get_y. |
| `scope` | string |  |  | Whether the benefit applies to the whole order or to listed products (promotion_products). Values: order, product. |
| `discount_percent` | decimal(9,4) | yes |  | Discount parameter for percent_off (0.1500 = 15%). Configuration value, not a measured rate. |
| `discount_amount` | decimal(12,2) | yes |  | Discount parameter for amount_off (per order or per unit by scope). |
| `min_order_amount` | decimal(12,2) | yes |  | Minimum merchandise subtotal required. |
| `eligibility` | string |  |  | Who can use it. Values: all, new_customers, loyalty_silver_plus, loyalty_gold, email_subscribers, lapsed_customers. |
| `channel_scope` | string |  |  | Sales channels where it is valid. Values: web_app, app_only, all_channels. |
| `start_at` | datetime |  |  | Validity start. |
| `start_date` | date |  |  | Date part of start_at. |
| `end_at` | datetime |  |  | Validity end (exclusive). |
| `end_date` | date |  |  | Last full day of validity. |
| `is_stackable` | boolean |  |  | Whether it can combine with another promotion in the same order. |
| `max_uses_per_customer` | integer | yes |  | Per-customer redemption limit. Null for unlimited. |
| `funded_by` | string |  |  | Who bears the discount cost. Values: company, supplier, marketplace. |

## customers

Customer master: when and how the record was created, acquisition source, account type, current home state, current loyalty tier and email subscription status.

- File: `csv/customers.csv` (16,008 rows)
- Grain: One row per customer record
- Primary key: `customer_id`
- Owner (fictional department): CRM

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `customer_id` | string |  | pk | Customer identifier. |
| `created_at` | datetime |  |  | When the customer record was created. |
| `created_date` | date |  |  | Date part of created_at. |
| `signup_source` | string |  |  | Event that created the record. Values: guest_checkout, account_signup, marketplace_order, b2b_onboarding. |
| `account_type` | string |  |  | Current account status for login. Values: registered, guest, marketplace_only, business. |
| `customer_segment` | string |  |  | Consumer or business. Values: consumer, business. |
| `business_type` | string | yes |  | Type of business for business customers. Null for consumers. Values: campground, outdoor_school, corporate. |
| `acquisition_traffic_source` | string |  |  | Traffic source of the session in which the record was created. marketplace and sales_team for non-session origins. Values: direct, organic_search, paid_search, paid_social, organic_social, display, email, affiliate, referral, push_notification, marketplace, sales_team. |
| `campaign_id` | string | yes | → campaigns.campaign_id | Campaign of the acquiring session (acquisition campaign). Null for organic, direct, marketplace and b2b. |
| `state_code` | string | yes |  | Current home state (from the current default shipping address). Null for marketplace_only customers without an address. |
| `birth_year` | integer | yes |  | Self-reported birth year. Null when not provided (always null for business and marketplace_only). |
| `loyalty_tier` | string | yes |  | Current loyalty tier as of the data end date. Null when not enrolled. Values: basic, silver, gold. |
| `is_email_subscribed` | boolean |  |  | Currently subscribed to marketing email. |
| `email_subscribed_date` | date | yes |  | Most recent subscription date. Null if never subscribed. |
| `email_unsubscribed_date` | date | yes |  | Most recent unsubscription date. Null if currently subscribed or never subscribed. |
| `closed_date` | date | yes |  | Date the account was closed at the customer's request. Null if open. |

## order_lines

Order lines with list price copied from product_prices at order time, actual unit selling price, line-level discount, tax, and cancelled quantity with reason. Stock-out lost demand is recorded here.

- File: `csv/order_lines.csv` (71,007 rows)
- Grain: One row per order x product (one line per SKU in an order)
- Primary key: `order_line_id`
- Owner (fictional department): Sales & E-commerce

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `order_line_id` | string |  | pk | Order line identifier. |
| `order_id` | string |  | → orders.order_id | Parent order. |
| `line_number` | integer |  |  | Position of the line within the order (1-based). |
| `product_id` | string |  | → products.product_id | Ordered SKU. |
| `promotion_id` | string | yes | → promotions.promotion_id | Line-level promotion (product markdown or bundle offer) that produced line_discount_amount. Null if none. |
| `qty_ordered` | integer |  |  | Units requested by the customer. |
| `qty_backordered` | integer |  |  | Units not in stock at any warehouse at order time and placed on backorder. Later shipped or cancelled. 0 if fully available. |
| `qty_cancelled` | integer |  |  | Units cancelled before shipment (immediately or later). 0 if none. |
| `cancel_reason` | string | yes |  | Reason for the cancelled units. Null when qty_cancelled = 0. Values: out_of_stock, backorder_timeout, customer_request, payment_failed, fraud_review. |
| `cancelled_date` | date | yes |  | Date the cancellation was recorded. Null when qty_cancelled = 0. |
| `unit_list_price` | decimal(12,2) |  |  | List price per unit at order time, as recorded by the order system from the merchandising price list. |
| `unit_price` | decimal(12,2) |  |  | Selling price per unit before line discount: list price for web/app, marketplace listing price for marketplace, contract price for b2b. |
| `line_discount_amount` | decimal(12,2) |  |  | Line-level promotional discount for the whole line (all ordered units), USD. |
| `tax_amount` | decimal(12,2) |  |  | Sales tax on the line at order time, for all ordered units. |
| `unit_standard_cost` | decimal(12,2) |  |  | Standard cost per unit at order time, as recorded by the order system from the merchandising cost list. |
| `allocated_warehouse_id` | string | yes |  | Warehouse the order system allocated the line to at order time (default warehouse for the ship-to state, or the nearest one with stock). Null for lines cancelled before allocation. Values: WH-W, WH-C, WH-E. |

## orders

Order header as captured by the order management system at the moment the order is placed. Holds order-level charges (shipping charged, order-level coupon) that are NOT allocated to lines here.

- File: `csv/orders.csv` (31,281 rows)
- Grain: One row per order (checkout confirmation, marketplace order import, or B2B order entry)
- Primary key: `order_id`
- Owner (fictional department): Sales & E-commerce

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `order_id` | string |  | pk | Order identifier. |
| `order_at` | datetime |  |  | Timestamp the order was placed (US Eastern time, as stored by the order system). |
| `order_date` | date |  |  | Date part of order_at. The time point Sales uses for 'revenue'. |
| `customer_id` | string |  | → customers.customer_id | Ordering customer. For marketplace orders, the customer record created from the marketplace buyer handle. |
| `session_id` | string | yes | → web_sessions.session_id | Web/app session in which the order was placed. Null for marketplace and B2B orders. |
| `channel` | string |  |  | Sales channel of the order. Values: web, app, marketplace, b2b. |
| `state_code` | string |  |  | Ship-to state of the order (2-letter US code, incl. DC). |
| `sales_rep_id` | string | yes |  | Account executive credited with the order. Populated for b2b orders only. |
| `promotion_id` | string | yes | → promotions.promotion_id | Order-level promotion applied at checkout (coupon code, free-shipping threshold offer). Line-level markdown promotions are on order_lines.promotion_id. |
| `shipping_method` | string |  |  | Delivery speed selected at checkout. Values: standard, expedited, freight. |
| `promised_delivery_date` | date |  |  | Latest delivery date shown to the customer at checkout (customer promise). |
| `shipping_charge_amount` | decimal(12,2) |  |  | Shipping fee charged to the customer for the whole order, before tax. 0 when shipping is free. |
| `shipping_tax_amount` | decimal(12,2) |  |  | Sales tax charged on shipping, in states that tax shipping. |
| `order_discount_amount` | decimal(12,2) |  |  | Order-level discount (coupon) in USD, not allocated to lines in this table. 0 if none. |
| `payment_method` | string |  |  | How the order is paid. Values: card, digital_wallet, net30_terms, marketplace_settlement. |
| `campaign_id` | string | yes | → campaigns.campaign_id | Last-click campaign stamped by the order system from the session UTM. Null for non-campaign, marketplace and b2b orders. |
| `loyalty_tier` | string | yes |  | Customer loyalty tier at the time of the order. Null if not enrolled. Values: basic, silver, gold. |

## products

Product master. One SKU per sellable variant (apparel and footwear sizes are separate SKUs sharing a style_code). Holds hierarchy, brand, physical and lifecycle attributes. Price and cost live in their own history tables.

- File: `csv/products.csv` (202 rows)
- Grain: One row per SKU
- Primary key: `product_id`
- Owner (fictional department): Merchandising

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `product_id` | string |  | pk | SKU identifier, shared across all domains. |
| `style_code` | string |  |  | Groups size/color variants of the same style. Equals a single SKU's own code for non-variant items. |
| `product_name` | string |  |  | Display name including variant (fictional). |
| `category` | string |  |  | Top level of the merchandise hierarchy. Values: camp_hike, outdoor_apparel, patio_garden, home_comfort. |
| `subcategory` | string |  |  | Second level of the hierarchy (see product_hierarchy). Values: tents, sleeping_gear, backpacks, camp_kitchen, rain_shells, insulated_jackets, base_layers, hiking_footwear, patio_furniture, grills, garden_tools, planters_irrigation, space_heaters, fire_pits_patio_heaters, blankets_throws, indoor_air. |
| `brand` | string |  |  | Fictional brand name. Private-label brands are owned by SampleHyperStore; national brands are fictional third-party brands. |
| `brand_type` | string |  |  | Whether the brand is the retailer's own label or a third-party brand. Values: private_label, national_brand. |
| `color` | string | yes |  | Color code for variant items; null when not applicable. |
| `size` | string | yes |  | Size for apparel (XS-XXL) and footwear (7-13, half sizes). Null for non-sized items. |
| `seasonality_profile` | string |  |  | Merchandising's seasonality classification used for buying and policy planning. Values: summer, spring, spring_summer, shoulder, fall, winter, holiday, year_round. |
| `weight_lb` | decimal(9,4) |  |  | Shipping weight of one unit in pounds, including packaging. |
| `is_oversize` | boolean |  |  | True when the item ships as a bulky/oversize parcel or freight (patio furniture, large grills, fire pits). Drives freight-in and outbound shipping cost and delivery delays. |
| `is_hazmat` | boolean |  |  | True for items with shipping restrictions (fuel canisters, propane heaters). |
| `case_pack_qty` | integer |  |  | Units per inner case. Purchase quantities are multiples of this. |
| `supplier_id` | string |  | → suppliers.supplier_id | Primary supplier as currently assigned in the master. Individual purchase orders may go to a secondary supplier. |
| `launch_date` | date |  |  | First date the SKU was sellable online. Before 2023-01-01 for the established assortment. |
| `discontinue_date` | date | yes |  | Date the SKU was set to discontinued (no new purchase orders; remaining stock is sold down, often at clearance price). Null if active. |

## shipment_lines

Units of an order line shipped in a shipment. Denormalises warehouse_id and shipped_date so inventory outflow can be aggregated per warehouse x product x day without joining.

- File: `csv/shipment_lines.csv` (68,621 rows)
- Grain: One row per shipment x order line
- Primary key: `shipment_line_id`
- Owner (fictional department): Logistics

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `shipment_line_id` | string |  | pk | Shipment line identifier. |
| `shipment_id` | string |  | → shipments.shipment_id | Parent shipment. |
| `order_line_id` | string |  | → order_lines.order_line_id | Order line being fulfilled. |
| `product_id` | string |  | → products.product_id | Shipped SKU (same as the order line's product). |
| `warehouse_id` | string |  |  | Origin warehouse; copy of shipments.warehouse_id. Values: WH-W, WH-C, WH-E. |
| `shipped_date` | date |  |  | Copy of shipments.shipped_date; the day inventory decreases. |
| `qty_shipped` | integer |  |  | Units shipped on this line. |

## shipments

Outbound shipments with origin warehouse, carrier, carrier's delivery estimate, actual delivery scan, and freight cost billed by the carrier.

- File: `csv/shipments.csv` (32,568 rows)
- Grain: One row per shipment (one parcel group leaving one warehouse with one carrier)
- Primary key: `shipment_id`
- Owner (fictional department): Logistics

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `shipment_id` | string |  | pk | Shipment identifier. |
| `order_id` | string |  | → orders.order_id | Order being fulfilled. |
| `shipment_number` | integer |  |  | Sequence of this shipment within the order (1 for the first). |
| `warehouse_id` | string |  |  | Origin warehouse. Values: WH-W, WH-C, WH-E. |
| `carrier_id` | string |  |  | Carrier code (CAR-01 ... CAR-06). v3 keeps no carrier master; the name and network type are on this row. |
| `carrier_name` | string |  |  | Fictional carrier name, copied from the carrier code (v3 folds the carrier master into shipments). |
| `carrier_type` | string |  |  | Carrier network type. Values: national_parcel, regional_parcel, ltl_freight. |
| `service_level` | string |  |  | Carrier service purchased. Values: ground, two_day, ltl_freight. |
| `shipped_at` | datetime |  |  | Carrier pickup scan time at the warehouse. |
| `shipped_date` | date |  |  | Date part of shipped_at. Invoice date equals this date. |
| `carrier_estimated_delivery_date` | date |  |  | Delivery date estimated by the carrier at pickup. |
| `delivered_at` | datetime | yes |  | Carrier delivery scan time. Null if not delivered (in transit at 2025-12-31, lost, returned to sender). Reported by an external system (not recomputed here). |
| `delivered_date` | date | yes |  | Date part of delivered_at. Reported by an external system (not recomputed here). |
| `delivery_status` | string |  |  | Last carrier tracking status as of data extract (2025-12-31). Values: delivered, in_transit, lost, returned_to_sender. Reported by an external system (not recomputed here). |
| `package_count` | integer |  |  | Number of cartons in the shipment. |
| `billed_weight_lbs` | decimal(9,4) |  |  | Billable weight reported by the carrier (greater of actual and dimensional weight). Reported by an external system (not recomputed here). |
| `freight_cost_amount` | decimal(12,2) |  |  | Transportation cost billed by the carrier for this shipment, incl. surcharges. Reported by an external system (not recomputed here). |
| `customer_id` | string |  | → customers.customer_id | Customer of the order, copied by the warehouse system from the order. |
| `state_code` | string |  |  | Ship-to state of the shipment. |
| `order_date` | date |  |  | Order date copied from orders. |
| `promised_delivery_date` | date |  |  | Delivery date promised to the customer at checkout, copied from orders. |

## refunds

Money returned to customers: for returns, for late or damaged deliveries (shipping refund), goodwill, and price adjustments. Split into merchandise, tax and shipping components.

- File: `csv/refunds.csv` (6,493 rows)
- Grain: One row per refund payment issued to a customer
- Primary key: `refund_id`
- Owner (fictional department): Customer Support

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `refund_id` | string |  | pk | Refund identifier. |
| `return_id` | string | yes | → returns.return_id | Related return. Null for refunds without a return (shipping refund, goodwill, price adjustment). |
| `order_id` | string |  | → orders.order_id | Original order. |
| `order_line_id` | string | yes | → order_lines.order_line_id | Order line refunded. Null for order-level refunds (e.g. shipping fee). |
| `ticket_id` | string | yes | → support_tickets.ticket_id | Support ticket that triggered the refund, if any. |
| `refund_type` | string |  |  | Why money was returned. Values: return, returnless, shipping_refund, goodwill, price_adjustment. |
| `refund_method` | string |  |  | Where the money went. Values: original_payment, store_credit, marketplace. |
| `refunded_at` | datetime |  |  | Time the refund was issued. |
| `refunded_date` | date |  |  | Date part of refunded_at. Support's time point for refunds. |
| `merchandise_refund_amount` | decimal(12,2) |  |  | Merchandise value refunded (after the discount originally given). |
| `tax_refund_amount` | decimal(12,2) |  |  | Sales tax refunded. |
| `shipping_refund_amount` | decimal(12,2) |  |  | Shipping charge refunded. |

## returns

Return requests and their receipt, inspection and restocking at a warehouse. qty_restocked feeds inventory_daily (S).

- File: `csv/returns.csv` (6,680 rows)
- Grain: One row per return authorization line (one order line returned once; a line may be returned in more than one authorization)
- Primary key: `return_id`
- Owner (fictional department): Customer Support

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `return_id` | string |  | pk | Return authorization line identifier. |
| `order_id` | string |  | → orders.order_id | Original order. |
| `order_line_id` | string |  | → order_lines.order_line_id | Returned order line. |
| `product_id` | string |  | → products.product_id | Returned SKU. |
| `customer_id` | string |  | → customers.customer_id | Customer who returned. |
| `warehouse_id` | string | yes |  | Warehouse that received the return (may differ from the shipping warehouse). Null if never received. Values: WH-W, WH-C, WH-E. |
| `requested_at` | datetime |  |  | Time the return was requested (portal, ticket, or marketplace). |
| `requested_date` | date |  |  | Date part of requested_at. |
| `received_date` | date | yes |  | Date the goods arrived at the warehouse. Null if not (yet) received. |
| `return_window_days` | integer |  |  | Return window of the policy in force when the item was delivered. Values: 30, 60. |
| `return_reason` | string |  |  | Reason selected by the customer. Values: wrong_size, defective, damaged_in_transit, not_as_described, arrived_late, changed_mind, other. |
| `return_method` | string |  |  | How the goods came back. Values: prepaid_label, customer_shipped, freight_pickup, marketplace_return. |
| `return_status` | string |  |  | Status as of 2025-12-31. Values: requested, in_transit, received, rejected, closed. |
| `qty_requested` | integer |  |  | Units the customer asked to return. |
| `qty_received` | integer |  |  | Units physically received. 0 if not received. |
| `item_condition` | string | yes |  | Inspection result of received units. Null if not received. Values: resellable, damaged, defective. |
| `qty_restocked` | integer |  |  | Units put back into sellable stock on restock_date. 0 if none. |
| `restock_date` | date | yes |  | Date restocked units became available in inventory. Null when qty_restocked = 0. |
| `return_shipping_cost_amount` | decimal(12,2) |  |  | Return label or pickup cost paid by the company. 0 when the customer paid. |
| `order_date` | date |  |  | Original order date, copied from orders. |
| `shipped_date` | date |  |  | Ship date of the returned line (first shipment), copied from shipments. |
| `delivered_date` | date | yes |  | Delivery date of the returned line, copied from shipments. Null if never confirmed delivered. |

## support_tickets

Customer support cases with category, contact method, timings, resolution and an optional post-case survey score.

- File: `csv/support_tickets.csv` (6,587 rows)
- Grain: One row per customer contact case
- Primary key: `ticket_id`
- Owner (fictional department): Customer Support

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `ticket_id` | string |  | pk | Ticket identifier. |
| `customer_id` | string | yes | → customers.customer_id | Customer, when identified. Null for unidentified pre-purchase questions. |
| `order_id` | string | yes | → orders.order_id | Order the case is about. Null for general questions. |
| `product_id` | string | yes | → products.product_id | Product the case is about, when the agent tagged one. |
| `contact_method` | string |  |  | How the customer reached support. Values: email, chat, phone, web_form. |
| `category` | string |  |  | Case category tagged by the agent. Values: where_is_my_order, damaged_item, defective_item, sizing_fit, return_request, refund_status, billing, product_question, other. |
| `priority` | string |  |  | Priority at creation. Values: low, normal, high. |
| `created_at` | datetime |  |  | Case creation time. |
| `created_date` | date |  |  | Date part of created_at. |
| `first_response_at` | datetime | yes |  | First agent reply. Null if none. |
| `first_response_date` | date | yes |  | Date part of first_response_at. |
| `resolved_at` | datetime | yes |  | Resolution time. Null if open at 2025-12-31. |
| `resolved_date` | date | yes |  | Date part of resolved_at. |
| `resolution` | string | yes |  | Outcome. Null while open. Values: info_provided, return_authorized, refund_issued, replacement_sent, escalated_to_carrier, no_action. |
| `reopened_count` | integer |  |  | Times the case was reopened. |
| `csat_score` | integer | yes |  | Post-case survey answer on a 1-5 scale. Null if the customer did not answer. Values: 1, 2, 3, 4, 5. |
| `shipment_id` | string | yes | → shipments.shipment_id | Shipment the ticket is about, when identified by the agent. |
| `carrier_id` | string | yes |  | Carrier code of that shipment, copied from the tracking record (same codes as shipments.carrier_id). |

## inventory_daily

End-of-day stock position per warehouse and SKU, with the day's unit movements (stock ledger summary). Rows exist for every day a SKU is stocked at a warehouse, including days with zero on hand.

- File: `csv/inventory_daily.csv` (575,899 rows)
- Grain: One row per date x warehouse x SKU, end-of-day snapshot plus that day's movements
- Primary key: `snapshot_date`, `warehouse_id`, `product_id`
- Owner (fictional department): Inventory Planning

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `snapshot_date` | date |  |  | Snapshot date. Quantities are as of end of day (warehouse local close). |
| `warehouse_id` | string |  |  | Warehouse holding the stock. Values: WH-W, WH-C, WH-E. |
| `product_id` | string |  | → products.product_id | SKU. |
| `qty_on_hand` | integer |  |  | Physical units in the warehouse at end of day, including units on quality hold and units allocated to orders. |
| `qty_on_order` | integer |  |  | Units on open purchase order lines for this warehouse not yet received (ordered minus received minus cancelled), including units in transit. |
| `qty_received` | integer |  |  | Units put away into sellable stock on this date (sum of receipts.qty_accepted by putaway_date). |
| `qty_shipped` | integer |  |  | Units shipped out to customers from this warehouse on this date (sum of shipment_lines.qty_shipped by ship date). |
| `qty_restocked` | integer |  |  | Returned units put back into sellable stock on this date (returns.qty_restocked by restock_date). |
| `qty_adjusted` | integer |  |  | Net signed adjustment on this date from cycle counts, shrinkage, damage and write-offs (reason detail is not kept). |

## purchase_order_lines

Ordered quantity, negotiated unit cost and dates promised by the supplier for each SKU on a PO.

- File: `csv/purchase_order_lines.csv` (13,044 rows)
- Grain: One row per PO x SKU
- Primary key: `po_line_id`
- Owner (fictional department): Procurement

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `po_line_id` | string |  | pk | PO line identifier. |
| `po_id` | string |  | → purchase_orders.po_id | Parent PO. |
| `product_id` | string |  | → products.product_id | SKU ordered. |
| `qty_ordered` | integer |  |  | Units ordered (multiple of products.case_pack_qty). |
| `qty_cancelled` | integer |  |  | Units cancelled before receipt (by buyer or supplier short-close). |
| `unit_cost` | decimal(12,2) |  |  | Negotiated supplier price per unit on this PO, excluding freight. |
| `requested_date` | date |  |  | Arrival date the buyer requested. |
| `promised_date` | date |  |  | Arrival date the supplier confirmed. |

## purchase_orders

Purchase order headers. Each PO ships to one warehouse. Holds dates, type and the actual inbound freight billed for the PO.

- File: `csv/purchase_orders.csv` (5,837 rows)
- Grain: One row per purchase order (one supplier, one destination warehouse)
- Primary key: `po_id`
- Owner (fictional department): Procurement

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `po_id` | string |  | pk | Purchase order identifier. |
| `supplier_id` | string |  | → suppliers.supplier_id | Supplier the PO was issued to. |
| `warehouse_id` | string |  |  | Destination warehouse. Values: WH-W, WH-C, WH-E. |
| `po_date` | date |  |  | Date the PO was issued. |
| `po_type` | string |  |  | Purpose of the PO. Values: replenishment, seasonal_buy, expedite, new_launch. |
| `freight_mode` | string |  |  | Inbound transport mode. Values: ocean, truckload, ltl, parcel, air. |
| `freight_amount` | decimal(12,2) |  |  | Actual inbound freight billed for the whole PO in USD (0 when supplier freight_terms is delivered). |
| `po_status` | string |  |  | Status as of the data extraction date (2025-12-31). Values: open, partially_received, closed, cancelled. |

## receipts

Each physical arrival against a PO line, with inspection result and supplier lot. Partial deliveries create multiple receipts per line. Accepted units enter on hand at put-away.

- File: `csv/receipts.csv` (13,766 rows)
- Grain: One row per receipt (one delivery of one PO line)
- Primary key: `receipt_id`
- Owner (fictional department): Procurement

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `receipt_id` | string |  | pk | Receipt identifier. |
| `po_line_id` | string |  | → purchase_order_lines.po_line_id | PO line received against. |
| `po_id` | string |  | → purchase_orders.po_id | PO (denormalized from the line for convenience). |
| `warehouse_id` | string |  |  | Receiving warehouse (same as the PO's). Values: WH-W, WH-C, WH-E. |
| `product_id` | string |  | → products.product_id | SKU received. |
| `supplier_id` | string |  | → suppliers.supplier_id | Supplier (denormalized from the PO). |
| `lot_id` | string |  |  | Supplier production lot of the delivered units. |
| `supplier_ship_date` | date |  |  | Date the supplier dispatched the goods (from the advance ship notice). |
| `received_date` | date |  |  | Date the goods arrived at the warehouse dock. |
| `received_at` | datetime |  |  | Dock arrival timestamp (local). Use received_date for analysis. |
| `putaway_date` | date | yes |  | Date accepted units became sellable stock. Null only if nothing was accepted. |
| `qty_received` | integer |  |  | Units counted at the dock. |
| `qty_accepted` | integer |  |  | Units that passed inspection and were put away. |
| `qty_rejected` | integer |  |  | Units failed at inspection and returned to the supplier (qty_received = qty_accepted + qty_rejected). Never enter on hand. |
| `reject_reason` | string | yes |  | Main inspection failure reason; null when qty_rejected = 0. Values: defect, damaged_in_transit, wrong_item, short_shelf_life. |

## suppliers

Supplier master with commercial terms. All names are fictional.

- File: `csv/suppliers.csv` (20 rows)
- Grain: One row per supplier
- Primary key: `supplier_id`
- Owner (fictional department): Procurement

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `supplier_id` | string |  | pk | Supplier identifier. |
| `supplier_name` | string |  |  | Fictional supplier name. |
| `supplier_type` | string |  |  | Kind of supplier. Values: contract_manufacturer, brand_vendor, distributor. |
| `country_code` | string |  |  | ISO 3166-1 alpha-2 country of the shipping origin. |
| `default_lead_time_days` | integer |  |  | Lead time the supplier quotes in the contract (PO date to arrival, calendar days). |
| `freight_terms` | string |  |  | Who pays inbound freight. With fob_origin SampleHyperStore pays and the cost appears in purchase_orders.freight_amount; with delivered it is built into the unit cost. Values: fob_origin, delivered. |
| `payment_terms` | string |  |  | Contract payment terms (informational; payables are not modeled). Values: net_30, net_45, net_60. |
| `onboarded_date` | date |  |  | Date the supplier was activated. |

## credit_memos

Accounting reversals of revenue for refunds and price adjustments, posted in batches and possibly in a later fiscal period than the refund. Includes the marketplace's fee reversal.

- File: `csv/credit_memos.csv` (6,441 rows)
- Grain: One row per credit memo line (revenue reversal posted by Finance)
- Primary key: `credit_memo_id`
- Owner (fictional department): Finance & Sales Ops

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `credit_memo_id` | string |  | pk | Credit memo line identifier. |
| `refund_id` | string |  | → refunds.refund_id | Refund being booked. |
| `invoice_id` | string |  | → invoices.invoice_id | Original invoice being reversed (first invoice of the order for order-level refunds). |
| `order_line_id` | string | yes | → order_lines.order_line_id | Order line reversed. Null for order-level reversals (shipping). |
| `product_id` | string | yes | → products.product_id | Product reversed. Null for order-level reversals. |
| `memo_type` | string |  |  | Accounting category of the reversal. Values: return, allowance, shipping, price_adjustment. |
| `credit_memo_date` | date |  |  | Posting date of the credit memo. |
| `qty_credited` | integer |  |  | Units reversed. 0 for allowances, shipping and returnless price adjustments. |
| `merchandise_credit_amount` | decimal(12,2) |  |  | Merchandise revenue reversed. |
| `tax_credit_amount` | decimal(12,2) |  |  | Tax reversed. |
| `shipping_credit_amount` | decimal(12,2) |  |  | Shipping revenue reversed. |
| `marketplace_fee_reversal_amount` | decimal(12,2) |  |  | Part of the marketplace fee returned by the marketplace on refund, per its settlement file. 0 for other channels. Reported by an external system (not recomputed here). |
| `sales_region_id` | string |  |  | Sales region stamped at credit memo posting. Values: R-WEST, R-CENTRAL, R-SOUTH, R-EAST, R-MOUNTAIN. |
| `fiscal_month` | string |  |  | Fiscal month of posting. The fiscal year starts on February 1 and uses ordinary calendar months: FY2024-P01 = February 2024, FY2024-P12 = January 2025. |

## invoice_lines

Invoiced units and amounts per order line, with order-level discount allocated, and standard unit cost at invoice date.

- File: `csv/invoice_lines.csv` (68,621 rows)
- Grain: One row per invoice x order line
- Primary key: `invoice_line_id`
- Owner (fictional department): Finance & Sales Ops

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `invoice_line_id` | string |  | pk | Invoice line identifier. |
| `invoice_id` | string |  | → invoices.invoice_id | Parent invoice. |
| `order_line_id` | string |  | → order_lines.order_line_id | Invoiced order line. |
| `product_id` | string |  | → products.product_id | Invoiced SKU. |
| `qty_invoiced` | integer |  |  | Units invoiced (= units shipped on the corresponding shipment line). |
| `unit_price` | decimal(12,2) |  |  | Unit selling price, copied from order_lines.unit_price. |
| `discount_amount` | decimal(12,2) |  |  | Discount on the invoiced units: pro-rated line discount plus allocated share of the order-level discount. |
| `tax_amount` | decimal(12,2) |  |  | Sales tax on the invoiced units. |
| `unit_standard_cost` | decimal(12,2) |  |  | Standard unit cost valid on invoice_date, used by Finance for cost of goods sold. |

## invoices

Invoices issued at shipment. Header holds billed shipping and the marketplace fee reported in the marketplace settlement.

- File: `csv/invoices.csv` (32,568 rows)
- Grain: One row per invoice (one invoice per shipment; revenue recognition event)
- Primary key: `invoice_id`
- Owner (fictional department): Finance & Sales Ops

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `invoice_id` | string |  | pk | Invoice identifier. |
| `order_id` | string |  | → orders.order_id | Invoiced order. |
| `shipment_id` | string |  | → shipments.shipment_id | Shipment that triggered the invoice. |
| `customer_id` | string |  | → customers.customer_id | Billed customer. |
| `channel` | string |  |  | Sales channel, copied from the order. Values: web, app, marketplace, b2b. |
| `state_code` | string |  |  | Ship-to state used for tax and regional reporting, copied from the order. |
| `invoice_date` | date |  |  | Revenue recognition date (equals shipments.shipped_date). |
| `payment_terms` | string |  |  | Payment terms. Values: prepaid, net30, marketplace_settlement. |
| `due_date` | date |  |  | Payment due date (invoice_date for prepaid). |
| `shipping_billed_amount` | decimal(12,2) |  |  | Shipping charge billed on this invoice (the order's full shipping charge on the first invoice, 0 on later ones). |
| `shipping_tax_amount` | decimal(12,2) |  |  | Tax on billed shipping. |
| `marketplace_fee_amount` | decimal(12,2) |  |  | Fee withheld by the marketplace for this invoice, as reported in its settlement file. 0 for other channels. Reported by an external system (not recomputed here). |
| `campaign_id` | string | yes | → campaigns.campaign_id | Marketing source code passed from the order to the ERP (orders.campaign_id). |
| `sales_region_id` | string |  |  | Sales region stamped at invoice posting, from the territory map valid on the invoice date. Values: R-WEST, R-CENTRAL, R-SOUTH, R-EAST, R-MOUNTAIN. |
| `fiscal_month` | string |  |  | Fiscal month of posting. The fiscal year starts on February 1 and uses ordinary calendar months: FY2024-P01 = February 2024, FY2024-P12 = January 2025. |

## sales_targets

Monthly sales targets set by Sales Ops in the annual plan. The revenue basis of target_amount is not documented in the source system.

- File: `csv/sales_targets.csv` (584 rows)
- Grain: One row per sales region x channel x fiscal month
- Primary key: `sales_region_id`, `channel`, `fiscal_month`
- Owner (fictional department): Finance & Sales Ops

| Column | Type | Null | Key | Description |
|---|---|---|---|---|
| `sales_region_id` | string |  |  | Sales region. Values: R-WEST, R-CENTRAL, R-SOUTH, R-EAST, R-MOUNTAIN. |
| `channel` | string |  |  | Sales channel. Values: web, app, marketplace, b2b. |
| `fiscal_month` | string |  |  | Fiscal month of posting. The fiscal year starts on February 1 and uses ordinary calendar months: FY2024-P01 = February 2024, FY2024-P12 = January 2025. |
| `target_amount` | decimal(12,2) |  |  | Target sales amount in USD for the month. |
| `target_order_count` | integer |  |  | Target number of orders for the month. |
