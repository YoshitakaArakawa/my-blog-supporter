"""Turn the simulated world into the 24 tables (column order and names from generator/columns.yaml)."""
from __future__ import annotations

import datetime as dt
import pathlib

import numpy as np
import pandas as pd
import yaml

from . import masters as M

CARRIER_NAME = {c[0]: c[1] for c in M.CARRIERS}
CARRIER_TYPE = {c[0]: c[2] for c in M.CARRIERS}

D = dt.date
TD = dt.timedelta


def load_schema(columns_file):
    """{table: [(column, type), ...]} in CSV column order, from generator/columns.yaml."""
    y = yaml.safe_load(open(pathlib.Path(columns_file), encoding='utf-8'))
    return {t: [(c[0], c[1]) for c in cols] for t, cols in y.items()}


def _fmt(series, typ):
    def f(v):
        if v is None or (isinstance(v, float) and np.isnan(v)):
            return ''
        if typ == 'boolean':
            return 'true' if bool(v) else 'false'
        if typ == 'integer':
            return str(int(v))
        if typ == 'decimal(12,2)':
            return f"{float(v):.2f}"
        if typ == 'decimal(9,4)':
            return f"{float(v):.4f}"
        if isinstance(v, (D, dt.datetime)):
            return v.isoformat()
        return str(v)
    return series.map(f)


def ts(x):
    return x.strftime('%Y-%m-%d %H:%M:%S') if x is not None else None


def build_tables(w):
    rng = np.random.default_rng(w.spec['seed'] + 1)
    end = w.end
    T = {}
    P = w.products
    pid = [p['product_id'] for p in P]

    # ---------------- customers (IDs by creation time)
    used = set()
    for o in w.orders:
        if not o['burn']:
            used.add(o['cust'])
    for s in w.R['web_sessions']:
        if s['cust'] is not None:
            used.add(s['cust'])
    for t in w.R['support_tickets']:
        if t['cust'] is not None:
            used.add(t['cust'])
    keep = [c for c in w.cust if c['created_date'] <= end and
            (c['k'] in used or c['created_date'] >= D(2022, 1, 1) or c['account_type'] == 'business'
             or c['subscribed'] or c['orders'] > 0)]
    keep.sort(key=lambda c: (c['created_at'], c['k']))
    cid = {c['k']: f"C-{i + 1:06d}" for i, c in enumerate(keep)}
    last_act = {}
    for o in w.orders:
        if not o['burn']:
            last_act[o['cust']] = max(last_act.get(o['cust'], o['date']), o['date'])
    for s in w.R['web_sessions']:
        if s['cust'] is not None:
            last_act[s['cust']] = max(last_act.get(s['cust'], s['date']), s['date'])
    rows = []
    for c in keep:
        state = c['state']
        if state and rng.random() < w.spec['customers']['move_share']:
            state = M.STATE_CODES[rng.choice(len(M.STATE_CODES), p=M.STATE_W)]
        closed = None
        if c['account_type'] == 'registered' and rng.random() < 0.012:
            la = last_act.get(c['k'], c['created_date'])
            cd = la + TD(days=int(rng.integers(20, 240)))
            if cd <= end:
                closed = cd
        rows.append(dict(
            customer_id=cid[c['k']], created_at=ts(c['created_at']), created_date=c['created_date'],
            signup_source=c['signup_source'], account_type=c['account_type'], customer_segment=c['customer_segment'],
            business_type=c['business_type'], acquisition_traffic_source=c['acquisition_traffic_source'],
            campaign_id=None if c['campaign_k'] is None else c['campaign_k'], state_code=state,
            birth_year=c['birth_year'], loyalty_tier=c['tier'] if c['account_type'] == 'registered' and c['enrolled'] else None,
            is_email_subscribed=bool(c['subscribed']), email_subscribed_date=c['sub_date'],
            email_unsubscribed_date=c['unsub_date'] if not c['subscribed'] else None, closed_date=closed))
    T['customers'] = rows

    # ---------------- campaigns / promotions IDs
    camp_used = [c for c in w.campaigns if (c['end_date'] is None or c['end_date'] >= w.start) and c['start_date'] <= end]
    camp_id = {c['k']: f"CMP-{i + 1:04d}" for i, c in enumerate(camp_used)}
    promo_used = [p for p in w.promos if p['end_date'] >= w.start and p['start_date'] <= end]
    promo_id = {p['k']: f"PRM-{i + 1:04d}" for i, p in enumerate(promo_used)}
    for r in rows:
        r['campaign_id'] = camp_id.get(r['campaign_id']) if r['campaign_id'] is not None else None

    # ---------------- orders and lines
    orders = sorted([o for o in w.orders if not o['burn']], key=lambda o: (o['at'], o['k']))
    oid = {o['k']: f"O-{i + 1:07d}" for i, o in enumerate(orders)}
    lid = {}
    n = 0
    for o in orders:
        for lk in o['lines']:
            n += 1
            lid[lk] = f"OL-{n:08d}"
    sid = {s['k']: f"S-{s['k']:08d}" for s in w.R['web_sessions']}
    T['orders'] = [dict(
        order_id=oid[o['k']], order_at=ts(o['at']), order_date=o['date'], customer_id=cid[o['cust']],
        session_id=sid.get(o['session']) if o['session'] else None, channel=o['channel'], state_code=o['state'],
        sales_rep_id=o['rep'], promotion_id=promo_id.get(o['promo']) if o['promo'] is not None else None,
        shipping_method=o['method'], promised_delivery_date=o['promised'], shipping_charge_amount=o['charge'],
        shipping_tax_amount=o['ship_tax'], order_discount_amount=o['odisc'], payment_method=o['pay'],
        campaign_id=camp_id.get(o['camp']) if o['camp'] is not None else None, loyalty_tier=o['tier'])
        for o in orders]
    L = w.lines
    T['order_lines'] = []
    for o in orders:
        for lk in o['lines']:
            l = L[lk]
            T['order_lines'].append(dict(
                order_line_id=lid[lk], order_id=oid[o['k']], line_number=l['n'], product_id=pid[l['p']],
                promotion_id=promo_id.get(l['promo']) if l['promo'] is not None else None, qty_ordered=l['qty'],
                qty_backordered=l['backordered'], qty_cancelled=l['cancelled'],
                cancel_reason=l['cancel_reason'] if l['cancelled'] else None,
                cancelled_date=l['cancelled_date'] if l['cancelled'] else None, unit_list_price=l['list_price'],
                unit_price=l['unit_price'], line_discount_amount=l['disc'], tax_amount=l['tax'],
                unit_standard_cost=l['cost'],
                allocated_warehouse_id=None if (l['cancel_reason'] == 'payment_failed') else M.WH_IDS[l['alloc_wh']] if l['alloc_wh'] is not None else None))

    # ---------------- web sessions and searches
    T['web_sessions'] = []
    T['web_searches'] = []
    nsr = 0
    for s in w.R['web_sessions']:
        T['web_sessions'].append(dict(
            session_id=sid[s['k']], visitor_id=f"V-{s['visitor']:09d}", customer_id=cid.get(s['cust']) if s['cust'] is not None else None,
            session_start_date=s['date'], channel=s['channel'], device_type=s['device'], state_code=s['state'], traffic_source=s['src'],
            campaign_id=camp_id.get(s['camp']) if s['camp'] is not None else None, landing_page_type=s['landing'],
            page_views=s['page_views'], product_views=s['product_views'], oos_product_views=s['oos_views'],
            cart_added_date=s['cart_date'], qty_added_to_cart=s['qty_cart'], checkout_started_date=s['checkout_date'],
            order_id=oid.get(s['order']) if s['order'] is not None else None, tracked_order_amount=s['amount']))
        for q in s['searches']:
            nsr += 1
            at = q['at']
            if at.date() < s['date']:
                at = dt.datetime.combine(s['date'], at.time())
            T['web_searches'].append(dict(
                search_id=f"SR-{nsr:09d}", session_id=sid[s['k']], searched_at=ts(at), searched_date=at.date(),
                query_text=q['q'], search_input_type=q['itype'], results_count=q['results'],
                results_in_stock_count=q['instock'], clicked_product_id=pid[q['click']] if q['click'] is not None else None,
                clicked_result_position=q['pos']))

    # ---------------- campaigns, campaign_daily, promotions
    spend_by = {}
    for r in w.R['campaign_daily']:
        spend_by[r['camp']] = spend_by.get(r['camp'], 0) + r['spend']
    T['campaigns'] = [dict(
        campaign_id=camp_id[c['k']], campaign_name=c['campaign_name'], marketing_channel=c['marketing_channel'],
        ad_platform=c['ad_platform'], objective=c['objective'], audience_type=c['audience_type'], theme=c['theme'],
        promotion_id=promo_id.get(c['promo']['k']) if c['promo'] else None, start_date=c['start_date'], end_date=c['end_date'],
        budget_amount=None if c['end_date'] is None else round(spend_by.get(c['k'], 0) * float(rng.uniform(0.9, 1.15)) / 100) * 100.0,
        cost_model=c['cost_model'], attribution_window=c['attribution_window'], managed_by=c['managed_by'])
        for c in camp_used]
    T['campaign_daily'] = [dict(
        campaign_id=camp_id[r['camp']], report_date=r['date'], impressions=r['imp'], clicks=r['clicks'],
        emails_sent=r['sent'], emails_delivered=r['delivered'], emails_opened=r['opened'], unsubscribes=r['unsub'],
        spend_amount=round(r['spend'], 2), platform_conversions=r['conv'], platform_conversion_value_amount=r['val'])
        for r in sorted(w.R['campaign_daily'], key=lambda r: (r['date'], r['camp'])) if r['camp'] in camp_id]
    T['promotions'] = []
    T['promotion_products'] = []
    for p in promo_used:
        st = dt.datetime.combine(p['start_date'], dt.time(0, 0))
        en = dt.datetime.combine(p['end_date'] + TD(days=1), dt.time(0, 0))
        T['promotions'].append(dict(
            promotion_id=promo_id[p['k']], promotion_name=p['promotion_name'], promotion_code=p['promotion_code'],
            promotion_type=p['promotion_type'], scope=p['scope'], discount_percent=p['discount_percent'],
            discount_amount=p['discount_amount'], min_order_amount=p['min_order_amount'], eligibility=p['eligibility'],
            channel_scope=p['channel_scope'], start_at=ts(st), start_date=p['start_date'], end_at=ts(en),
            end_date=p['end_date'], is_stackable=p['is_stackable'], max_uses_per_customer=p['max_uses_per_customer'],
            funded_by=p['funded_by']))
        for pp in p['products']:
            T['promotion_products'].append(dict(
                promotion_id=promo_id[p['k']], product_id=pp['product_id'], unit_promo_price=pp['unit_promo_price'],
                is_featured=pp['is_featured'], added_date=pp['added_date']))

    # ---------------- products
    T['products'] = [dict(
        product_id=p['product_id'], style_code=p['style_code'], product_name=p['product_name'], category=p['category'],
        subcategory=p['subcategory'], brand=p['brand'], brand_type=p['brand_type'], color=p['color'], size=p['size'],
        seasonality_profile=p['seasonality_profile'], weight_lb=p['weight_lb'], is_oversize=bool(p['is_oversize']),
        is_hazmat=bool(p['is_hazmat']), case_pack_qty=p['case_pack_qty'], supplier_id=p['supplier_id'],
        launch_date=p['launch_date'], discontinue_date=p['discontinue_date']) for p in P]

    # ---------------- shipments, shipment_lines, invoices, invoice_lines
    shs = sorted(w.R['shipments'], key=lambda s: (s['at'], s['k']))
    shid = {s['k']: f"SH-{i + 1:07d}" for i, s in enumerate(shs)}
    T['shipments'] = [dict(
        shipment_id=shid[s['k']], order_id=oid[s['order']], shipment_number=s['n'], warehouse_id=M.WH_IDS[s['w']],
        carrier_id=s['carrier'], carrier_name=CARRIER_NAME[s['carrier']], carrier_type=CARRIER_TYPE[s['carrier']],
        service_level=s['service'], shipped_at=ts(s['at']), shipped_date=s['date'],
        carrier_estimated_delivery_date=s['eta'], delivered_at=ts(s['deliv_at']), delivered_date=s['deliv'],
        delivery_status=s['status'], package_count=s['packages'], billed_weight_lbs=s['billed'],
        freight_cost_amount=s['freight'], customer_id=cid[s['cust']], state_code=s['state'], order_date=s['order_date'],
        promised_delivery_date=s['promised']) for s in shs]
    sl_sorted = sorted(w.R['shipment_lines'], key=lambda r: (shid[r['shipment']], r['k']))
    slid = {r['k']: f"SL-{i + 1:08d}" for i, r in enumerate(sl_sorted)}
    T['shipment_lines'] = [dict(
        shipment_line_id=slid[r['k']], shipment_id=shid[r['shipment']], order_line_id=lid[r['line']],
        product_id=pid[r['p']], warehouse_id=M.WH_IDS[r['w']], shipped_date=r['date'], qty_shipped=r['qty'])
        for r in sl_sorted]
    invs = sorted(w.R['invoices'], key=lambda r: (shid[r['shipment']], r['k']))
    iid = {r['k']: f"INV-{i + 1:07d}" for i, r in enumerate(invs)}
    T['invoices'] = [dict(
        invoice_id=iid[r['k']], order_id=oid[r['order']], shipment_id=shid[r['shipment']], customer_id=cid[r['cust']],
        channel=r['channel'], state_code=r['state'], invoice_date=r['date'], payment_terms=r['terms'], due_date=r['due'],
        shipping_billed_amount=r['ship_billed'], shipping_tax_amount=r['ship_tax'], marketplace_fee_amount=r['fee'],
        campaign_id=camp_id.get(r['camp']) if r['camp'] is not None else None, sales_region_id=r['region'],
        fiscal_month=r['fm']) for r in invs]
    ils = sorted(w.R['invoice_lines'], key=lambda r: (iid[r['invoice']], r['k']))
    ilid = {r['k']: f"IL-{i + 1:08d}" for i, r in enumerate(ils)}
    T['invoice_lines'] = [dict(
        invoice_line_id=ilid[r['k']], invoice_id=iid[r['invoice']], order_line_id=lid[r['line']], product_id=pid[r['p']],
        qty_invoiced=r['qty'], unit_price=r['unit_price'], discount_amount=r['disc'], tax_amount=r['tax'],
        unit_standard_cost=r['cost']) for r in ils]

    # ---------------- returns, refunds, credit memos, tickets
    rets = sorted(w.R['returns'], key=lambda r: (r['req_at'], r['k']))
    rid = {r['k']: f"RT-{i + 1:07d}" for i, r in enumerate(rets)}
    T['returns'] = [dict(
        return_id=rid[r['k']], order_id=oid[r['order']], order_line_id=lid[r['line']], product_id=pid[r['p']],
        customer_id=cid[r['cust']], warehouse_id=M.WH_IDS[r['w']] if r['w'] is not None else None,
        requested_at=ts(r['req_at']), requested_date=r['req_date'], received_date=r['recv'],
        return_window_days=r['window'], return_reason=r['reason'], return_method=r['method'],
        return_status=r['status'], qty_requested=r['qreq'], qty_received=r['qrecv'], item_condition=r['cond'],
        qty_restocked=r['qrest'], restock_date=r['rest_date'], return_shipping_cost_amount=r['cost'],
        order_date=r['order_date'], shipped_date=r['shipped'], delivered_date=r['deliv']) for r in rets]
    tks = sorted(w.R['support_tickets'], key=lambda r: (r['created'], r['k']))
    tid = {r['k']: f"TK-{i + 1:07d}" for i, r in enumerate(tks)}
    T['support_tickets'] = [dict(
        ticket_id=tid[r['k']], customer_id=cid.get(r['cust']) if r['cust'] is not None else None,
        order_id=oid.get(r['order']) if r['order'] is not None else None,
        product_id=pid[r['p']] if r['p'] is not None else None, contact_method=r['method'], category=r['cat'],
        priority=r['pri'], created_at=ts(r['created']), created_date=r['created'].date(), first_response_at=ts(r['first']),
        first_response_date=r['first'].date() if r['first'] else None, resolved_at=ts(r['resolved']),
        resolved_date=r['resolved'].date() if r['resolved'] else None, resolution=r['resolution'],
        reopened_count=r['reopened'], csat_score=r['csat'], shipment_id=shid.get(r['sh']) if r['sh'] is not None else None,
        carrier_id=r['carrier']) for r in tks]
    rfs = sorted(w.R['refunds'], key=lambda r: (r['at'], r['k']))
    rfid = {r['k']: f"RF-{i + 1:07d}" for i, r in enumerate(rfs)}
    T['refunds'] = [dict(
        refund_id=rfid[r['k']], return_id=rid.get(r['ret']) if r['ret'] is not None else None, order_id=oid[r['order']],
        order_line_id=lid[r['line']] if r['line'] is not None else None,
        ticket_id=tid.get(r['ticket']) if r['ticket'] is not None else None, refund_type=r['type'],
        refund_method=r['method'], refunded_at=ts(r['at']), refunded_date=r['date'],
        merchandise_refund_amount=r['merch'], tax_refund_amount=r['tax'], shipping_refund_amount=r['ship'])
        for r in rfs]
    # credit memos: next Monday strictly after the refund
    first_inv_of_order = {}
    for r in invs:
        first_inv_of_order.setdefault(r['order'], r['k'])
    cms = []
    for r in rfs:
        dd = r['date'] + TD(days=(7 - r['date'].weekday()) % 7 or 7)
        if dd > end:
            continue
        l = r['l']
        o = r['o']
        inv_k = l['first_invoice'] if l is not None and l.get('first_invoice') is not None else first_inv_of_order.get(o['k'])
        if r['type'] == 'return':
            mt = 'allowance' if r['method'] == 'store_credit' else 'return'
        else:
            mt = {'returnless': 'allowance', 'shipping_refund': 'shipping', 'goodwill': 'allowance',
                  'price_adjustment': 'price_adjustment'}[r['type']]
        qty = r['qty'] if mt == 'return' else 0
        fee = 0.0
        if o['channel'] == 'marketplace':
            fee = round(w.ev['E2']['fee_reversal_share_on_refund'] * w.ev['E2']['marketplace_fee_rate'] * (r['merch'] + r['ship']), 2)
        cms.append(dict(refund=r, date=dd, inv=inv_k, line=lid[l['k']] if l is not None else None,
                        product=pid[l['p']] if l is not None else None, mt=mt, qty=qty, fee=fee,
                        region=w.region(o['state'], dd), fm=w.fiscal_month(dd)))
    cms.sort(key=lambda c: (c['date'], rfid[c['refund']['k']]))
    T['credit_memos'] = [dict(
        credit_memo_id=f"CM-{i + 1:07d}", refund_id=rfid[c['refund']['k']], invoice_id=iid[c['inv']],
        order_line_id=c['line'], product_id=c['product'], memo_type=c['mt'], credit_memo_date=c['date'],
        qty_credited=c['qty'], merchandise_credit_amount=c['refund']['merch'], tax_credit_amount=c['refund']['tax'],
        shipping_credit_amount=c['refund']['ship'], marketplace_fee_reversal_amount=c['fee'],
        sales_region_id=c['region'], fiscal_month=c['fm']) for i, c in enumerate(cms)]

    # ---------------- masters
    # v3: no warehouses / carriers tables (folded into shipments)
    T['suppliers'] = [dict(s) for s in w.suppliers.values()]

    # ---------------- purchasing (POs that touch the output period)
    pols = w.R['purchase_order_lines']
    rcs = w.R['receipts']
    keep_po = []
    for po in w.R['purchase_orders']:
        if po['date'] > end:
            continue
        if po['date'] >= w.start:
            keep_po.append(po)
            continue
        # burn-in PO: keep if anything is still open or arrives in the period
        for lk in po['lines']:
            pl = pols[lk]
            if any(rcs[r]['recv'] >= w.start or (rcs[r]['putaway'] is not None and rcs[r]['putaway'] >= w.start)
                   for r in pl['receipts']) or pl.get('cancel_date', w.start) >= w.start:
                keep_po.append(po)
                break
    keep_po.sort(key=lambda p: (p['date'], p['k']))
    poid = {p['k']: f"PO-{i + 1:06d}" for i, p in enumerate(keep_po)}
    T['purchase_orders'] = []
    T['purchase_order_lines'] = []
    T['receipts'] = []
    poll = []
    for po in keep_po:
        lines = [pols[k] for k in po['lines']]
        rec_all = [rcs[r] for pl in lines for r in pl['receipts']]
        got = sum(r['qrecv'] for r in rec_all if r['recv'] <= end)
        want = sum(pl['qty'] - pl['cancelled'] for pl in lines)
        cancelled_all = all(pl['cancelled'] == pl['qty'] for pl in lines)
        status = 'cancelled' if cancelled_all else ('closed' if got >= want else ('open' if got == 0 else 'partially_received'))
        T['purchase_orders'].append(dict(
            po_id=poid[po['k']], supplier_id=po['sup'], warehouse_id=M.WH_IDS[po['w']], po_date=po['date'],
            po_type=po['type'], freight_mode=po['mode'], freight_amount=po['freight'], po_status=status))
        poll.extend(lines)
    polid = {pl['k']: f"POL-{i + 1:07d}" for i, pl in enumerate(poll)}
    for pl in poll:
        po = w.R['purchase_orders'][pl['po']]
        cdate = pl.get('cancel_date')
        T['purchase_order_lines'].append(dict(
            po_line_id=polid[pl['k']], po_id=poid[pl['po']], product_id=pid[pl['p']], qty_ordered=pl['qty'],
            qty_cancelled=pl['cancelled'] if (cdate is None or cdate <= end) else 0, unit_cost=pl['cost'],
            requested_date=pl['req'], promised_date=pl['prom']))
    rec_out = sorted([rcs[r] for pl in poll for r in pl['receipts'] if rcs[r]['recv'] <= end],
                     key=lambda r: (r['recv_at'], r['k']))
    for i, r in enumerate(rec_out):
        T['receipts'].append(dict(
            receipt_id=f"RCV-{i + 1:07d}", po_line_id=polid[r['pol']], po_id=poid[r['po']], warehouse_id=M.WH_IDS[r['w']],
            product_id=pid[r['p']], supplier_id=r['sup'], lot_id=r['lot'], supplier_ship_date=r['ship'],
            received_date=r['recv'], received_at=ts(r['recv_at']),
            putaway_date=r['putaway'] if (r['putaway'] is not None and r['putaway'] <= end) else None,
            qty_received=r['qrecv'], qty_accepted=r['qacc'], qty_rejected=r['qrej'], reject_reason=r['reason']))

    # ---------------- inventory_daily
    parts = []
    for (day, ws, ps, oh, oo, rv, sh, rs, ad) in w.inv_rows:
        parts.append(pd.DataFrame(dict(snapshot_date=day.isoformat(), warehouse_id=np.array(M.WH_IDS)[ws],
                                       product_id=np.array(pid)[ps], qty_on_hand=oh, qty_on_order=oo, qty_received=rv,
                                       qty_shipped=sh, qty_restocked=rs, qty_adjusted=ad)))
    T['inventory_daily'] = pd.concat(parts, ignore_index=True)

    # ---------------- sales targets (generator truth: invoice-date merchandise net of discounts, before returns)
    T['sales_targets'] = build_targets(w, T, rng)
    return T


def build_targets(w, T, rng):
    inv = pd.DataFrame(T['invoices'])[['invoice_id', 'channel', 'sales_region_id', 'fiscal_month', 'order_id']]
    il = pd.DataFrame(T['invoice_lines'])
    il['merch'] = il['qty_invoiced'] * il['unit_price'] - il['discount_amount']
    m = il.groupby('invoice_id')['merch'].sum().reset_index().merge(inv, on='invoice_id')
    act = m.groupby(['sales_region_id', 'channel', 'fiscal_month']).agg(amount=('merch', 'sum'),
                                                                         orders=('order_id', 'nunique')).reset_index()
    sp = w.spec['sales_targets']
    months = []
    d = D(2023, 1, 1)
    while d <= D(2026, 1, 1):
        months.append(d)
        d = D(d.year + (d.month == 12), d.month % 12 + 1, 1)
    rows = []
    year_noise = {}
    for d in months:
        fm = w.fiscal_month(d)
        fy = fm[:6]
        regions = ['R-WEST', 'R-CENTRAL', 'R-SOUTH', 'R-EAST'] + (['R-MOUNTAIN'] if d >= w.E6 else [])
        chans = ['web', 'app', 'b2b'] + (['marketplace'] if d >= w.E2 else [])
        for r in regions:
            for ch in chans:
                key = (r, ch, fy)
                if key not in year_noise:
                    year_noise[key] = rng.normal(1.0, sp['attainment_sd_region_year'])
                a = act[(act.sales_region_id == r) & (act.channel == ch) & (act.fiscal_month == fm)]
                if len(a):
                    amt, cnt = float(a.amount.iloc[0]), int(a.orders.iloc[0])
                else:   # month without actuals (January 2026): last year's same month x growth
                    prev = w.fiscal_month(D(d.year - 1, d.month, 1))
                    a2 = act[(act.sales_region_id == r) & (act.channel == ch) & (act.fiscal_month == prev)]
                    amt = float(a2.amount.iloc[0]) * 1.07 if len(a2) else 0.0
                    cnt = int(a2.orders.iloc[0] * 1.05) if len(a2) else 0
                f = year_noise[key] * rng.normal(1.0, sp['attainment_sd_month'])
                rows.append(dict(sales_region_id=r, channel=ch, fiscal_month=fm,
                                 target_amount=round(amt / max(f, 0.5) / 100) * 100.0,
                                 target_order_count=int(round(cnt / max(f, 0.5)))))
    return rows


def write_csvs(T, cols, out_dir):
    out = pathlib.Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    info = {}
    for name, rows in T.items():
        names = [c for c, _ in cols[name]]
        df = rows if isinstance(rows, pd.DataFrame) else pd.DataFrame(rows, columns=names)
        missing = [c for c in names if c not in df.columns]
        assert not missing, (name, missing)
        df = df[names].copy()
        for c, typ in cols[name]:
            if name == 'inventory_daily' and typ == 'integer':
                df[c] = df[c].astype('int64').astype(str)
            elif name == 'inventory_daily':
                df[c] = df[c].astype(str)
            else:
                df[c] = _fmt(df[c].astype(object), typ)
        p = out / f"{name}.csv"
        df.to_csv(p, index=False, lineterminator=chr(10))
        info[name] = dict(rows=len(df), bytes=p.stat().st_size)
    return info
