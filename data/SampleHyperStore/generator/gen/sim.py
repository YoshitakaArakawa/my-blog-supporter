"""Daily simulation of the SampleHyperStore world.

One loop over days drives demand (sessions -> orders) and supply (stock -> shipments -> purchase orders ->
receipts). Every table is a record of a step of that loop. Internal keys are integers; public IDs are
assigned in chronological order by write.py."""
from __future__ import annotations

import bisect
import collections
import datetime as dt
import math
import zlib

import numpy as np

from . import masters as M

D = dt.date
TD = dt.timedelta


def d_(s):
    return s if isinstance(s, D) else D.fromisoformat(str(s))


class World:
    def __init__(self, spec, scale_factor=1.0):
        self.spec = spec
        self.rng = np.random.default_rng(spec['seed'])
        self.sf = scale_factor
        per = spec['period']
        self.d0 = d_(per['burn_in_start'])
        self.start = d_(per['start'])
        self.end = d_(per['end'])
        self.burn_stop = d_(per['burn_in_order_stop'])
        self.ndays = (self.end - self.d0).days + 1
        ev = spec['events']
        self.ev = ev
        self.E2 = d_(ev['E2']['start'])
        self.E4 = d_(ev['E4']['date'])
        on = lambda k: ev.get(k, {}).get('enabled', True)
        self.on = on
        self.E5s, self.E5e = (d_(ev['E5']['start']), d_(ev['E5']['end'])) if on('E5') else (D(1900, 1, 1), D(1900, 1, 1))
        self.E6 = d_(ev['E6']['date'])
        self.mountain = set(ev['E6']['from_west']) | set(ev['E6']['from_south'])
        self.E7c, self.E7p = d_(ev['E7']['supplier_cost_date']), d_(ev['E7']['standard_cost_and_list_price_date'])
        self.E8 = d_(ev['E8']['date'])
        self.bf_dates = [d_(x) for x in spec['season']['black_friday_dates']]
        self.truth = collections.defaultdict(list)   # answer key material
        self._build_masters()
        self._build_calendar_arrays()
        self._init_state()
        # one random stream per subsystem, so a change in one part does not reshuffle the others
        seed = spec['seed']
        self.streams = {k: np.random.default_rng([seed, i]) for i, k in enumerate(
            ('backorder', 'demand', 'fulfil', 'supply', 'adjust'))}

    # ------------------------------------------------------------------ setup
    def _build_masters(self):
        rng = self.rng
        self.products = M.build_products(rng, self.spec)
        P = self.P = len(self.products)
        self.pidx = {p['product_id']: i for i, p in enumerate(self.products)}
        self.sc_names = list(M.SUBCATS)
        self.p_sc = np.array([self.sc_names.index(p['subcategory']) for p in self.products])
        self.p_cat = [p['category'] for p in self.products]
        self.p_oversize = np.array([p['is_oversize'] for p in self.products])
        self.p_weight = np.array([p['weight_lb'] for p in self.products])
        self.p_pop = np.array([p['popularity'] for p in self.products])
        self.p_launch = [p['launch_date'] for p in self.products]
        self.p_disc = [p['discontinue_date'] for p in self.products]
        self.p_case = np.array([p['case_pack_qty'] for p in self.products])
        # E7 and annual standard-cost resets
        e7 = self.ev['E7']
        self.p_e7 = np.array([self.on('E7') and p['subcategory'] in e7['subcategories'] for p in self.products])
        self.p_price_step = np.where(self.p_e7, rng.uniform(*e7['list_price_increase'], P), 0.0)
        self.p_cost_step = np.where(self.p_e7, rng.uniform(*e7['supplier_cost_increase'], P), 0.0)
        reset = self.spec['pricing']['standard_cost_annual_reset']
        self.p_resets = {y: np.clip(rng.normal(reset['mean'], reset['sd'], P), 0, None) for y in (2022, 2023, 2024, 2025)}
        self.p_base_cost = np.array([p['base_price'] * p['cost_ratio'] for p in self.products])
        self.p_actual_cost_noise = rng.uniform(0.97, 1.03, P)
        # E3: switch some tents to the secondary supplier after the event
        e3 = self.ev['E3']
        self.p_supplier_hist = []   # list of (from_date, supplier)
        for i, p in enumerate(self.products):
            hist = [(D(2000, 1, 1), p['supplier_id'])]
            if p['supplier_id'] == e3['main_tent_supplier'] and p['subcategory'] == 'tents' \
                    and rng.random() < e3['switch_primary_supplier_share']:
                hist.append((d_(e3['switch_date']), e3['secondary_supplier']))
                p['supplier_id'] = e3['secondary_supplier']
                self.truth['E3_switched_products'].append(p['product_id'])
            self.p_supplier_hist.append(hist)
        # suppliers
        self.suppliers = {s[0]: dict(zip(['supplier_id', 'supplier_name', 'supplier_type', 'country_code',
                                          'default_lead_time_days', 'freight_terms', 'payment_terms',
                                          'onboarded_date'], s)) for s in M.SUPPLIERS}
        # promotions and campaigns
        self.promos = M.build_promotions(self.products, rng, e5=self.on('E5'))
        self.promos.sort(key=lambda x: (x['start_date'], x['promotion_name']))
        for i, pr in enumerate(self.promos):
            pr['k'] = i
        self.promo_by_name = {pr['promotion_name']: pr for pr in self.promos}
        self.campaigns = M.build_campaigns(rng, e5=self.on('E5'))
        self.campaigns.sort(key=lambda x: (x['start_date'], x['campaign_name']))
        for i, c in enumerate(self.campaigns):
            c['k'] = i
            c['promo'] = self.promo_by_name.get(c['promo_name'])
        # E12: products of spring 2025 product promotions whose supplier ships short
        e12 = self.ev['E12']
        lo, hi = d_(e12['spring_2025_promotions'][0]), d_(e12['spring_2025_promotions'][1])
        self.e12_products = set()
        for pr in self.promos:
            if pr['scope'] == 'product' and lo <= pr['start_date'] <= hi:
                for pp in pr['products']:
                    self.e12_products.add(self.pidx[pp['product_id']])
        self.truth['E12_products'] = sorted(self.products[p]['product_id'] for p in self.e12_products)
        # sales reps: 10 reps, each a group of states
        groups = collections.defaultdict(list)
        for s in M.STATE_CODES:
            groups[M.STATES[s][3]].append(s)
        self.rep_states = {}
        reps_per_region = {'R-WEST': 3, 'R-CENTRAL': 2, 'R-SOUTH': 3, 'R-EAST': 2}
        r = 1
        for reg, n in reps_per_region.items():
            sts = sorted(groups[reg])
            for j in range(n):
                self.rep_states[f"REP-{r:03d}"] = sts[j::n]
                r += 1
        self.state_rep = {s: rep for rep, ss in self.rep_states.items() for s in ss}

    def _build_calendar_arrays(self):
        sp = self.spec['season']
        n = self.ndays
        self.dates = [self.d0 + TD(days=i) for i in range(n)]
        mids = []
        for y in range(self.d0.year - 1, self.end.year + 2):
            for m in range(1, 13):
                mids.append(D(y, m, 15))
        mid_ord = np.array([x.toordinal() for x in mids])
        day_ord = np.array([x.toordinal() for x in self.dates])
        self.season = {}
        for prof, vals in sp['profiles'].items():
            v = np.array([vals[x.month - 1] for x in mids])
            self.season[prof] = np.interp(day_ord, mid_ord, v)
        tv = np.array([sp['traffic_month'][x.month - 1] for x in mids])
        traffic = np.interp(day_ord, mid_ord, tv)
        growth = (1 + self.spec['scale']['yearly_growth']) ** ((day_ord - D(2023, 1, 1).toordinal()) / 365.0)
        self.trend = traffic * growth
        wk = np.array([sp['weekday'][x.weekday()] for x in self.dates])
        bfm = np.ones(n)
        for bf in self.bf_dates:
            for k, v in sp['black_friday'].items():
                dd = bf + TD(days=int(k))
                i = (dd - self.d0).days
                if 0 <= i < n:
                    bfm[i] = v
        self.bfm = bfm
        self.day_mult = self.trend * wk * bfm
        # per-product demand index (season of its profile x trend), and cumulative sums for forecasting
        profs = [p['seasonality_profile'] for p in self.products]
        self.sc_season = np.vstack([self.season[M.SUBCATS[sc][2]] for sc in self.sc_names])  # (16, n)
        self.p_index = np.vstack([self.season[pr] for pr in profs]) * self.trend[None, :]      # (P, n)
        pad = 200
        ext = np.concatenate([self.p_index, np.repeat(self.p_index[:, -1:], pad, axis=1)], axis=1)
        self.p_index_cum = np.concatenate([np.zeros((self.P, 1)), np.cumsum(ext, axis=1)], axis=1)
        self.sc_share = np.array([M.SUBCATS[sc][5] for sc in self.sc_names])

    def _init_state(self):
        P = self.P
        W = 3
        self.on_hand = np.zeros((W, P), dtype=np.int64)
        self.reserved = np.zeros((W, P), dtype=np.int64)
        self.on_order = np.zeros((W, P), dtype=np.int64)
        self.defective = np.zeros((W, P), dtype=np.int64)     # E9 defective units inside on hand
        self.stocked = np.ones((W, P), dtype=bool)
        self.stocked[0, self.p_oversize] = False             # oversize never stocked at WH-W
        self.mv = {k: np.zeros((W, P), dtype=np.int64) for k in ('recv', 'ship', 'restock', 'adj')}
        self.first_row_day = np.full((W, P), 10 ** 9)
        self.ema = np.zeros((W, P))
        self.demand_today = np.zeros((W, P))
        self.sched = collections.defaultdict(list)            # day index -> events
        self.backorders = []                                   # dicts
        self.allocs = collections.defaultdict(list)            # ship day index -> alloc dicts
        self.last_review = {}
        # output records
        self.R = collections.defaultdict(list)
        self.inv_rows = []
        # customers
        self.cust = []          # dicts
        self.cust_lam = np.zeros(0)
        self.cust_active_from = np.zeros(0, dtype=np.int64)
        self.cust_active_to = np.zeros(0, dtype=np.int64)
        self.cust_penalty_from = np.full(0, 10 ** 9, dtype=np.int64)
        self.cust_app = np.zeros(0, dtype=bool)
        self.n_visitors = 0
        self.anon_pool = collections.deque(maxlen=4000)
        self.mkt_customers = []
        self.orders = []
        self.lines = []
        self.n_sessions_out = 0
        # initial stock: ~45 days of expected demand
        self._initial_customers()
        exp_units = 95.0 * self.sf
        share = self.p_pop * self.sc_share[self.p_sc] / np.bincount(self.p_sc, weights=self.p_pop)[self.p_sc]
        share = share / share.sum()
        wh_share = np.zeros((3, P))
        for s, w in zip(M.STATE_CODES, M.STATE_W):
            wi = M.WH_IDS.index(M.STATES[s][2])
            wh_share[wi] += w
        wh_share = wh_share / wh_share.sum(axis=0, keepdims=True)
        for p in range(P):
            if self.p_oversize[p]:
                wh_share[1, p] += wh_share[0, p]
                wh_share[0, p] = 0
        self.ema = exp_units * share[None, :] * wh_share
        for p in range(P):
            if self.p_launch[p] <= self.d0:
                st = np.round(self.ema[:, p] * self.p_index[p, :45].sum() * 1.0).astype(int)
                self.on_hand[:, p] = np.where(self.stocked[:, p], st + 2, 0)

    # ------------------------------------------------------------------ helpers
    def di(self, day):
        return (day - self.d0).days

    def list_price(self, p, day):
        base = self.products[p]['base_price']
        if day >= self.E7p and self.p_e7[p]:
            return round(base * (1 + self.p_price_step[p])) - 0.01
        return base

    def std_cost(self, p, day):
        c = self.p_base_cost[p]
        for y in (2022, 2023, 2024, 2025):
            if day >= D(y, 2, 1):
                c *= 1 + self.p_resets[y][p]
        if day >= self.E7p and self.p_e7[p]:
            c *= 1 + self.p_cost_step[p]
        return round(c, 2)

    def po_unit_cost(self, p, day, supplier):
        c = self.p_base_cost[p] * self.p_actual_cost_noise[p]
        for y in (2022, 2023, 2024, 2025):
            if day >= D(y, 1, 15):
                c *= 1 + self.p_resets[y][p]
        if day >= self.E7c and self.p_e7[p]:
            c *= 1 + self.p_cost_step[p]
        if supplier == self.ev['E3']['secondary_supplier']:
            c *= 1.15
        return round(c * self.rng.uniform(0.985, 1.015), 2)

    def supplier_of(self, p, day):
        s = None
        for frm, sup in self.p_supplier_hist[p]:
            if day >= frm:
                s = sup
        return s

    def serving_wh(self, state, p):
        w = M.WH_IDS.index(M.STATES[state][2])
        if w == 0 and self.p_oversize[p]:
            return 1
        return w

    def is_active_product(self, p, day):
        if self.p_launch[p] > day:
            return False
        disc = self.p_disc[p]
        if disc is not None and day > disc:
            return self.on_hand[:, p].sum() - self.reserved[:, p].sum() > 0
        return True

    def available(self, w, p):
        return self.on_hand[w, p] - self.reserved[w, p] if self.stocked[w, p] else 0

    def ship_day_after(self, day, k):
        d = day + TD(days=k)
        if d.weekday() == 6:
            d += TD(days=1)
        return d

    def bf_week(self, day):
        return any(0 <= (day - bf).days <= 6 for bf in self.bf_dates)

    def fiscal_month(self, day):
        m = day.month - 1
        y = day.year
        if m == 0:
            m, y = 12, y - 1
        return f"FY{y}-P{m:02d}"

    def region(self, state, day):
        return M.region_of(state, day, self.E6, self.mountain)

    # ------------------------------------------------------------------ customers
    def _new_customer(self, day, created_at, signup_source, account_type, acq_source, campaign_k, state,
                      segment='consumer', business_type=None, from_burn=False):
        rng = self.rng
        cs = self.spec['customers']
        k = len(self.cust)
        reg = account_type == 'registered'
        app = reg and rng.random() < self.spec['app_user_share_registered']
        email = (reg and rng.random() < cs['email_optin_registered']) or \
                (account_type == 'guest' and rng.random() < cs['email_optin_guest'])
        rm = cs['repeat_multiplier_by_acquisition']
        lam = rng.lognormal(cs['daily_visit_rate_lognormal']['mean_log'], cs['daily_visit_rate_lognormal']['sigma'])
        lam *= rm.get(acq_source, rm['default'])
        if account_type in ('marketplace_only', 'business'):
            lam = 0.0
        if account_type == 'guest':
            lam *= 0.6
        churn = rng.lognormal(cs['churn_after_days_lognormal']['mean_log'], cs['churn_after_days_lognormal']['sigma'])
        c = dict(k=k, created_at=created_at, created_date=created_at.date(), signup_source=signup_source,
                 account_type=account_type, customer_segment=segment, business_type=business_type,
                 acquisition_traffic_source=acq_source, campaign_k=campaign_k, state=state,
                 birth_year=int(rng.integers(1950, 2004)) if reg and rng.random() < 0.7 else None,
                 enrolled=reg and rng.random() < cs['loyalty']['enroll_share_registered'],
                 tier=None, spend=collections.deque(), subscribed=email,
                 sub_date=created_at.date() if email else None, unsub_date=None, closed=None,
                 visitors=[self._new_visitor()] + ([self._new_visitor()] if rng.random() < 0.35 else []),
                 app_visitor=self._new_visitor() if app else None, orders=0, last_order=None, app=app,
                 n_lines_bought=0)
        if c['enrolled']:
            c['tier'] = 'basic'
        self.cust.append(c)
        di = self.di(created_at.date()) if created_at.date() >= self.d0 else 0
        self.cust_lam = np.append(self.cust_lam, lam)
        self.cust_active_from = np.append(self.cust_active_from, di + 1)
        self.cust_active_to = np.append(self.cust_active_to, di + int(churn))
        self.cust_penalty_from = np.append(self.cust_penalty_from, 10 ** 9)
        self.cust_app = np.append(self.cust_app, app)
        return c

    def _new_visitor(self):
        self.n_visitors += 1
        return self.n_visitors

    def _initial_customers(self):
        rng = self.rng
        n = int(self.spec['scale']['initial_customers'] * self.sf)
        srcs = list(self.spec['traffic_sources_new_visitor'])
        sw = np.array(list(self.spec['traffic_sources_new_visitor'].values()))
        for _ in range(n):
            day = D(2019, 1, 1) + TD(days=int(rng.integers(0, 1095)))
            t = dt.datetime.combine(day, dt.time(int(rng.integers(7, 23)), int(rng.integers(60)), int(rng.integers(60))))
            reg = rng.random() < 0.6
            c = self._new_customer(day, t, 'account_signup' if reg else 'guest_checkout',
                                   'registered' if reg else 'guest', srcs[rng.choice(len(srcs), p=sw / sw.sum())],
                                   None, M.STATE_CODES[rng.choice(len(M.STATE_CODES), p=M.STATE_W)])
            # older customers: give them some history for tiers
            c['orders'] = int(rng.integers(1, 4))
            c['last_order'] = day
            # remaining active life from 2022
            k = c['k']
            self.cust_active_from[k] = 0
            self.cust_active_to[k] = int(rng.integers(30, 900))
        # B2B accounts
        nb = int(self.spec['scale']['b2b_accounts'] * self.sf)
        self.b2b = []
        for i in range(nb):
            if rng.random() < 0.6:
                day = D(2019, 1, 1) + TD(days=int(rng.integers(0, 1095)))
            else:
                day = D(2022, 1, 15) + TD(days=int(rng.integers(0, 1380)))
            t = dt.datetime.combine(day, dt.time(int(rng.integers(8, 18)), int(rng.integers(60)), 0))
            btype = rng.choice(['campground', 'outdoor_school', 'corporate'], p=[0.5, 0.25, 0.25])
            state = M.STATE_CODES[rng.choice(len(M.STATE_CODES), p=M.STATE_W)]
            c = self._new_customer(day, t, 'b2b_onboarding', 'business', 'sales_team', None, state,
                                   segment='business', business_type=str(btype))
            c['b2b_rate'] = rng.lognormal(np.log(1.25 / 150), 0.6)
            self.b2b.append(c)

    # ------------------------------------------------------------------ promotions
    def active_product_promos(self, day):
        out = {}
        for pr in self.promos:
            if pr['scope'] != 'product' or not (pr['start_date'] <= day <= pr['end_date']):
                continue
            for pp in pr['products']:
                if pp['added_date'] <= day:
                    out.setdefault(self.pidx[pp['product_id']], []).append((pr, pp))
        return out

    def line_discount(self, pr, pp, unit_price, qty):
        t = pr['promotion_type']
        if t == 'percent_off':
            return round(unit_price * qty * pr['discount_percent'], 2)
        if t == 'amount_off':
            return round(min(pr['discount_amount'], unit_price * 0.5) * qty, 2)
        if t == 'fixed_price':
            return round(max(unit_price - pp['unit_promo_price'], 0) * qty, 2)
        if t == 'buy_x_get_y':   # buy 2, get the 3rd at half price
            return round((qty // 3) * unit_price * 0.5, 2)
        return 0.0

    # ------------------------------------------------------------------ main loop
    def run(self):
        for i, day in enumerate(self.dates):
            self.step(i, day)
        return self

    def step(self, i, day):
        self.today = day
        for k in self.mv:
            self.mv[k][:] = 0
        self.demand_today[:] = 0
        S = self.streams
        self._process_scheduled(i, day)
        self.rng = S['backorder']
        self._fill_backorders(i, day)
        if day <= self.burn_stop or day >= self.start:
            self.rng = S['demand']
            self._demand(i, day)
        self.rng = S['fulfil']
        self._ship(i, day)
        self.rng = S['supply']
        self._replenish(i, day)
        self.rng = S['adjust']
        self._adjustments(i, day)
        # update forecast EMA (deseasonalised demand)
        a = self.spec['replenishment']['forecast_alpha']
        idx = np.maximum(self.p_index[:, i], 0.05)
        obs = self.demand_today / idx[None, :] / max(self.bfm[i], 1.0)
        self.ema = (1 - a) * self.ema + a * obs
        if day == D(self.start.year - 1, 12, 31):
            self._close_burn_in()
        if day >= self.start:
            self._snapshot(i, day)

    # ------------------------------------------------------------------ scheduled events
    def _process_scheduled(self, i, day):
        for ev in self.sched.pop(i, []):
            kind = ev[0]
            if kind == 'putaway':
                _, w, p, qty, bad = ev
                self.on_hand[w, p] += qty
                self.defective[w, p] += bad
                self.mv['recv'][w, p] += qty
            elif kind == 'dock':
                _, w, p, qty = ev
                self.on_order[w, p] -= qty
            elif kind == 'po_cancel':
                _, w, p, qty = ev
                self.on_order[w, p] -= qty
            elif kind == 'restock':
                _, w, p, qty = ev
                self.on_hand[w, p] += qty
                self.mv['restock'][w, p] += qty
            elif kind == 'cancel_alloc':
                _, a = ev
                self._cancel_alloc(a, day, 'customer_request')
            elif kind == 'annual_review':
                pass
        if day.month == 1 and day.day == 1:
            self._annual_tier_review(day)

    def _close_burn_in(self):
        # drop open burn-in backorders and unshipped allocations so that 2023 starts clean
        for a in [a for lst in self.allocs.values() for a in lst]:
            self.reserved[a['w'], a['p']] -= a['qty']
        self.allocs.clear()
        self.backorders = []

    # ------------------------------------------------------------------ demand
    def _demand(self, i, day):
        self.promo_today = self.active_product_promos(day)
        self._prod_weights(i, day)
        self._sessions(i, day)
        if day >= self.E2:
            self._marketplace_orders(i, day)
        if day.weekday() < 5:
            self._b2b_orders(i, day)
        if day >= self.start:
            rng = self.rng
            for _ in range(rng.poisson(1.7 * self.sf * self.day_mult[i])):
                c = self.cust[int(rng.integers(len(self.cust)))] if rng.random() < 0.5 else None
                p = self._pick_product()
                self._ticket(dict(cust=c['k'], k=None) if c else None, None, 'product_question', day, product=p)
            for _ in range(rng.poisson(0.3 * self.sf)):
                c = self.cust[int(rng.integers(len(self.cust)))]
                self._ticket(dict(cust=c['k'], k=None), None, 'other', day)

    def _prod_weights(self, i, day):
        P = self.P
        w = self.p_pop * self.sc_share[self.p_sc] * self.sc_season[self.p_sc, i]
        w = w / np.bincount(self.p_sc, weights=self.p_pop)[self.p_sc]
        active = np.array([self.is_active_product(p, day) for p in range(P)])
        # price response (E7)
        if day >= self.E7p:
            w = w * np.where(self.p_e7, (1 + self.p_price_step) ** self.spec['pricing']['price_elasticity'], 1.0)
        boost = np.ones(P)
        for p, lst in self.promo_today.items():
            pr, pp = lst[0]
            pb = self.ev['E12']['promo_boost']
            b = pb['featured'] if pp['is_featured'] else pb['other']
            if pr['promotion_type'] == 'buy_x_get_y':
                b = 1.15
            boost[p] = b
        self.w_base = np.where(active, w, 0.0)
        self.w_promo = self.w_base * boost
        self.active_today = active
        sc_tot = np.bincount(self.p_sc, weights=self.w_promo, minlength=len(self.sc_names))
        self.sc_w = sc_tot / sc_tot.sum()

    def _pick_product(self, sc=None, skew=None, exclude=()):
        rng = self.rng
        w = self.w_promo.copy()
        if sc is not None:
            w = np.where(self.p_sc == sc, w, 0.0)
        if skew is not None:
            w = w * skew
        for e in exclude:
            w[e] = 0
        s = w.sum()
        if s <= 0:
            return None
        return int(rng.choice(self.P, p=w / s))

    def _sessions(self, i, day):
        rng = self.rng
        spec = self.spec
        sc = spec['scale']
        cs = spec['customers']
        mult = self.day_mult[i] * self.sf
        # active campaigns by source
        self.camp_today = collections.defaultdict(list)
        for c in self.campaigns:
            if c['start_date'] <= day and (c['end_date'] is None or day <= c['end_date']):
                self.camp_today[c['marketing_channel']].append(c)
        self.camp_stats = collections.defaultdict(lambda: dict(sessions=0, orders=[], sent=0))
        sessions = []
        # 1) new visitors
        nv_share = spec['traffic_sources_new_visitor']
        base_new = sc['web_app_sessions_per_day'] * 0.6 * mult
        if day >= self.E2:
            base_new *= 1 - self.ev['E2']['web_new_visitor_cannibalisation']
        base_new *= spec['scale']['new_visitor_share'] / 0.6
        for src, sh in nv_share.items():
            lam = base_new * sh
            if src in ('paid_search', 'paid_social', 'display', 'affiliate'):
                ao = sum(c['weight'] for c in self.camp_today[src] if c['end_date'] is None)
                tot = sum(c['weight'] for c in self.camp_today[src])
                lam *= tot / max(ao, 1e-9) if ao > 0 else 0
                if self.E5s <= day <= self.E5e and src in ('paid_social', 'display'):
                    lam *= 1 + self.ev['E5']['extra_paid_traffic']
            for _ in range(rng.poisson(lam)):
                sessions.append((src, None))
        # 2) known customers browsing
        n = len(self.cust)
        if n:
            act = (self.cust_active_from <= i) & (self.cust_active_to >= i)
            pen = np.where((self.cust_penalty_from <= i) & (i < self.cust_penalty_from + 365),
                           self.ev['E8']['repeat_multiplier_after_late'], 1.0)
            lam = self.cust_lam * act * pen * self.day_mult[i]
            draws = rng.poisson(lam)
            ks = np.nonzero(draws)[0]
            kn = spec['traffic_sources_known_customer']
            srcs = list(kn)
            sw = np.array(list(kn.values()))
            sw = sw / sw.sum()
            for k in ks:
                c = self.cust[k]
                if c['closed']:
                    continue
                for _ in range(draws[k]):
                    src = srcs[rng.choice(len(srcs), p=sw)]
                    if src == 'push_notification' and not c['app']:
                        src = 'direct'
                    if src == 'email' and not c['subscribed']:
                        src = 'direct'
                    sessions.append((src, k))
        # 3) email / push sends
        for ch in ('email', 'push_notification'):
            for c in self.camp_today[ch]:
                if not self._is_send_day(c, day):
                    continue
                sessions.extend(self._send(c, i, day))
        # carried-over email sessions (next days)
        for item in self.sched.pop(('sess', i), []):
            sessions.append(item)
        self.oos_view_cache = {}
        for s in sessions:
            self._one_session(i, day, *s)
        self.noncamp_orders_today = [x['amount'] for x in self.R['web_sessions'][-len(sessions) - 5:]
                                     if x['date'] == day and x['order'] is not None and x['camp'] is None]
        self._campaign_daily(i, day)

    def _is_send_day(self, c, day):
        if c['send_every'] == 1:
            return True
        if day.weekday() not in c['send_weekdays']:
            return False
        weeks = (day - c['start_date']).days // 7
        return (weeks % max(c['send_every'] // 7, 1)) == 0 if c['send_every'] >= 7 else True

    def _send(self, c, i, day):
        rng = self.rng
        if c['marketing_channel'] == 'email':
            subs = [x for x in self.cust if x['subscribed'] and not x['closed']]
            if c['audience_type'] == 'lapsed_customers':
                subs = [x for x in subs if x['last_order'] is not None and (day - x['last_order']).days > 180]
        else:
            subs = [x for x in self.cust if x['app'] and not x['closed']]
        sent = len(subs)
        if sent == 0:
            return []
        delivered = int(sent * rng.uniform(0.965, 0.98))
        open_rate = rng.uniform(0.19, 0.24) + (0.08 if day.year >= 2024 else 0.0)
        if c['marketing_channel'] == 'push_notification':
            open_rate = rng.uniform(0.05, 0.08)
        opened = int(delivered * open_rate)
        ctr = 0.024 if c['theme'] != 'black_friday' else 0.04
        if c['audience_type'] == 'lapsed_customers':
            ctr *= 0.55
            opened = int(opened * self.spec['customers']['lapsed_open_rate_factor'])
        if c['marketing_channel'] == 'push_notification':
            ctr = 0.016
        clicks = rng.binomial(delivered, ctr)
        unsub = 0
        if c['marketing_channel'] == 'email':
            ur = self.spec['customers']['annual_unsubscribe_after_send'] * (2.5 if c['theme'] == 'black_friday' else 1.0)
            unsub = rng.binomial(delivered, ur)
            for x in rng.choice(len(subs), size=min(unsub, len(subs)), replace=False):
                cu = subs[x]
                cu['subscribed'] = False
                cu['unsub_date'] = day
        st = self.camp_stats[c['k']]
        st.update(sent=sent, delivered=delivered, opened=opened, unsub=unsub, clicks=clicks)
        out = []
        picks = rng.choice(len(subs), size=min(clicks, len(subs)), replace=False)
        for j, x in enumerate(picks):
            k = subs[x]['k']
            r = rng.random()
            lag = 0 if r < 0.7 else (1 if r < 0.9 else 2)
            src = 'email' if c['marketing_channel'] == 'email' else 'push_notification'
            if lag == 0:
                out.append((src, k))
            else:
                self.sched[('sess', i + lag)].append((src, k, c))
            if rng.random() < 0.25:   # later direct visit (Q65)
                self.sched[('sess', i + int(rng.integers(1, 4)))].append(('direct', k))
        return [(s, k, c) for (s, k) in out]

    def _pick_campaign(self, src, known):
        lst = self.camp_today.get(src, [])
        if not lst:
            return None
        w = np.array([c['weight'] * (2.0 if known and c['audience_type'] == 'retargeting' else 1.0) *
                      (0.4 if not known and c['audience_type'] == 'retargeting' else 1.0) for c in lst])
        return lst[int(self.rng.choice(len(lst), p=w / w.sum()))]

    def _one_session(self, i, day, src, k, camp=None):
        rng = self.rng
        spec = self.spec
        fn = spec['funnel']
        self._pending_searches = []
        known = k is not None
        c = self.cust[k] if known else None
        # channel and device
        if known and c['app'] and (src == 'push_notification' or rng.random() < spec['app_session_share_of_app_users']):
            channel = 'app'
            dm = spec['device_mix_app']
        else:
            channel = 'web'
            dm = spec['device_mix_web']
        device = rng.choice(list(dm), p=np.array(list(dm.values())))
        # identification
        if known:
            if channel == 'app':
                visitor = c['app_visitor']
                ident = True
            else:
                visitor = c['visitors'][int(rng.integers(len(c['visitors'])))]
                ident = src == 'email' or rng.random() < spec['known_customer_login_share_web']
        else:
            if self.anon_pool and rng.random() < 0.2:
                visitor = self.anon_pool[int(rng.integers(len(self.anon_pool)))]
            else:
                visitor = self._new_visitor()
                self.anon_pool.append(visitor)
            ident = False
        # campaign
        if camp is None and src in ('paid_search', 'paid_social', 'display', 'affiliate'):
            camp = self._pick_campaign(src, known)
        if camp is not None:
            self.camp_stats[camp['k']]['sessions'] += 1
        # state of the visitor
        state = c['state'] if known and c['state'] else M.STATE_CODES[rng.choice(len(M.STATE_CODES), p=M.STATE_W)]
        # intent
        theme_sc = M.THEME_SUBCATS.get(camp['theme']) if camp else None
        if theme_sc and rng.random() < 0.7:
            sc = self.sc_names.index(theme_sc[int(rng.integers(len(theme_sc)))])
        elif state in M.WEST_STATES:   # camping is more popular in the West
            cm = self.ev['E3']['mountain_camp_hike_demand'] if state in self.mountain else self.ev['E3']['west_camp_hike_demand']
            wv = self.sc_w * np.array([cm if M.SUBCATS[n][0] == 'camp_hike' else 1.0 for n in self.sc_names])
            sc = int(rng.choice(len(self.sc_names), p=wv / wv.sum()))
        else:
            sc = int(rng.choice(len(self.sc_names), p=self.sc_w))
        # landing page
        landing = rng.choice(['home', 'category', 'product', 'search', 'promotion', 'content'],
                             p=[0.28, 0.2, 0.3, 0.06, 0.08, 0.08])
        if camp is not None and camp['promo'] is not None and rng.random() < 0.6:
            landing = 'promotion'
        # search
        searched_click = None
        if landing == 'search' or rng.random() < fn['p_search_session']:
            searched_click = self._searches(i, day, state, sc)
        pv_p = fn['p_product_view'][src]
        page_views = 1
        product_views = oos_views = 0
        cart_date = checkout_date = None
        qty_cart = 0
        order = None
        if rng.random() < pv_p or searched_click is not None:
            product_views = 1 + int(rng.geometric(0.35))
            viewed = []
            first = searched_click if searched_click is not None else self._pick_product(sc)
            if first is None:
                first = self._pick_product()
            if first is not None and self.available(self.serving_wh(state, first), first) <= 0                     and rng.random() < fn['oos_substitution_share']:
                alt = [q for q in range(self.P) if self.p_sc[q] == self.p_sc[first] and self.w_base[q] > 0
                       and self.available(self.serving_wh(state, q), q) > 0]
                if alt:
                    wa = np.array([self.w_promo[q] for q in alt])
                    oos_views += 1   # the out-of-stock page was seen before switching
                    first = alt[int(rng.choice(len(alt), p=wa / wa.sum()))]
            viewed.append(first)
            for _ in range(product_views - 1):
                q = self._pick_product(sc if rng.random() < 0.7 else None)
                if q is not None:
                    viewed.append(q)
            for q in viewed:
                if self.available(self.serving_wh(state, q), q) <= 0:
                    oos_views += 1
            page_views = product_views + int(rng.poisson(2.5))
            pc = fn['p_cart_given_view'][src] * (fn['known_customer_cart_multiplier'] if known else 1.0)
            if self.available(self.serving_wh(state, first), first) <= 0:
                pc *= fn['oos_add_to_cart_multiplier']
            if rng.random() < pc:
                cart_date = day
                lines = self._basket(first, state)
                qty_cart = sum(q for _, q in lines) + (1 if rng.random() < 0.15 else 0)
                page_views += 2
                if rng.random() < fn['p_checkout_given_cart']:
                    checkout_date = day
                    page_views += 2
                    po = fn['p_order_given_checkout'][device]
                    subtotal = sum(self.list_price(p, day) * q for p, q in lines)
                    threshold = spec['shipping']['free_threshold']
                    e5 = self.E5s <= day <= self.E5e
                    if e5:
                        threshold = self.ev['E5']['threshold']
                    if subtotal < threshold:
                        po *= fn['shipping_shock'][device]
                    if e5 and device == 'mobile':
                        po *= self.ev['E5']['checkout_uplift_mobile']
                    if rng.random() < po:
                        order = self._web_order(i, day, channel, c, state, lines, src, camp, device)
                        ident = True
                        c = self.cust[order['cust']]
        elif rng.random() < 0.08:
            page_views = 1 + int(rng.poisson(1.0))
        # account sign-up without an order
        if not known and order is None and rng.random() < spec['customers']['signup_without_order_rate']:
            t = dt.datetime.combine(day, self._rand_time())
            c = self._new_customer(day, t, 'account_signup', 'registered', src,
                                   camp['k'] if camp else None, state)
            c['visitors'][0] = visitor
            ident = True
        if day < self.start:
            return
        self.n_sessions_out += 1
        sess = dict(k=self.n_sessions_out, visitor=visitor, cust=(c['k'] if (c is not None and ident) else None),
                    date=day, channel=channel, device=str(device), src=src, state=state,
                    camp=camp['k'] if camp else None, landing=str(landing), page_views=int(page_views),
                    product_views=int(product_views), oos_views=int(oos_views), cart_date=cart_date,
                    qty_cart=int(qty_cart), checkout_date=checkout_date, order=None, amount=None,
                    searches=self._pending_searches)
        self._pending_searches = []
        if order is not None:
            sess['order'] = order['k']
            sess['amount'] = order['total']
            order['session'] = sess['k']
            if day > self.start and rng.random() < 0.012:   # session started before midnight, order placed after
                sess['date'] = day - TD(days=1)
                if cart_date:
                    sess['cart_date'] = day - TD(days=1)
            if camp is not None:
                self.camp_stats[camp['k']]['orders'].append(order['total'])
        self.R['web_sessions'].append(sess)

    _pending_searches = []

    def _rand_time(self, evening=True):
        rng = self.rng
        h = int(rng.choice(24, p=_HOUR_W))
        return dt.time(h, int(rng.integers(60)), int(rng.integers(60)))

    def _searches(self, i, day, state, sc):
        rng = self.rng
        nq = 1 + int(rng.random() < 0.35) + int(rng.random() < 0.12)
        clicked = None
        t0 = dt.datetime.combine(day, self._rand_time())
        cur_sc = sc
        for j in range(nq):
            r = rng.random()
            if r < 0.08 and j == 0:
                q = M.GAP_QUERIES[int(rng.integers(len(M.GAP_QUERIES)))]
                q_sc = None
                itype = 'typed'
            else:
                q_sc = cur_sc if r < 0.93 else int(rng.integers(len(self.sc_names)))
                vocab = M.SEARCH_QUERIES[self.sc_names[q_sc]]
                q = vocab[int(rng.choice(len(vocab), p=_zipf(len(vocab))))]
                itype = 'autocomplete' if rng.random() < 0.4 else 'typed'
            if j > 0 and self._pending_searches and self._pending_searches[-1]['results'] == 0:
                itype = 'suggested_after_no_results'
                q_sc = sc
                vocab = M.SEARCH_QUERIES[self.sc_names[q_sc]]
                q = vocab[0]
            res = self._query_results(q, q_sc, day)
            instock = [p for p in res if self.available(self.serving_wh(state, p), p) > 0]
            click = pos = None
            if res:
                pc = 0.55 if instock else 0.12
                if rng.random() < pc:
                    pool = instock if instock else res
                    wts = np.array([self.w_promo[p] / max(self.w_base[p], 1e-12) for p in pool]) ** 2.0
                    wts = wts * np.array([self.p_pop[p] for p in pool])
                    click = pool[int(rng.choice(len(pool), p=wts / wts.sum()))]
                    pos = res.index(click) + 1
                    clicked = click
            t = t0 + TD(seconds=int(60 * j + rng.integers(5, 50)))
            self._pending_searches.append(dict(at=t, q=q, itype=itype, results=len(res), instock=len(instock),
                                               click=click, pos=pos))
            if click is not None:
                break
        return clicked

    def _query_results(self, q, q_sc, day):
        key = (q, day)
        if key in self.oos_view_cache:
            return self.oos_view_cache[key]
        if q_sc is None:
            res = []
        else:
            cand = [p for p in range(self.P) if self.p_sc[p] == q_sc and self.active_today[p]]
            h = zlib.crc32(q.encode()) % 1000 / 1000.0
            frac = (0.7 + 0.3 * h) if len(q.split()) == 1 else (0.15 + 0.3 * h)   # specific queries match fewer SKUs
            cand.sort(key=lambda p: zlib.crc32(f'{q}|{p}'.encode()) % 997)
            res = cand[:max(1, int(round(len(cand) * frac)))] if cand else []
            res.sort(key=lambda p: -self.w_promo[p])
        self.oos_view_cache[key] = res
        return res

    def _basket(self, first, state):
        rng = self.rng
        n = int(rng.choice([1, 2, 3, 4, 5, 6], p=self.spec['basket_lines_p']))
        lines = [first]
        for _ in range(n - 1):
            if rng.random() < 0.5:
                q = self._pick_product(self.p_sc[first], exclude=lines)
            else:
                q = self._pick_product(exclude=lines)
            if q is None:
                continue
            if self.available(self.serving_wh(state, q), q) <= 0 and rng.random() > 0.3:
                continue
            lines.append(q)
        out = []
        for p in lines:
            price = self.products[p]['base_price']
            qty = 1 + int(rng.random() < (0.25 if price < 40 else 0.08)) + int(rng.random() < 0.03)
            pr = self.promo_today.get(p)
            if pr and pr[0][0]['promotion_type'] == 'buy_x_get_y' and rng.random() < 0.5:
                qty = 3
            out.append((p, qty))
        return out

    # ------------------------------------------------------------------ orders
    def _web_order(self, i, day, channel, c, state, lines, src, camp, device):
        rng = self.rng
        new = c is None
        t = dt.datetime.combine(day, self._rand_time())
        if new:
            guest = rng.random() < self.spec['customers']['guest_share_new_web']
            c = self._new_customer(day, t, 'guest_checkout' if guest else 'account_signup',
                                   'guest' if guest else 'registered', src, camp['k'] if camp else None, state)
        elif c['account_type'] == 'guest' and rng.random() < 0.25:
            c['account_type'] = 'registered'
            c['enrolled'] = rng.random() < 0.85
            c['tier'] = 'basic' if c['enrolled'] else None
        ship_state = state if rng.random() < 0.95 else M.STATE_CODES[rng.choice(len(M.STATE_CODES), p=M.STATE_W)]
        pay = 'digital_wallet' if rng.random() < (0.5 if channel == 'app' else 0.22) else 'card'
        return self._create_order(i, day, t, channel, c, ship_state, lines, camp, pay, new_customer=new)

    def _marketplace_orders(self, i, day):
        rng = self.rng
        e2 = self.ev['E2']
        ramp = min(1.0, (day - self.E2).days / e2['ramp_days'])
        lam = self.spec['scale']['marketplace_orders_per_day'] * ramp * self.day_mult[i] * self.sf
        skew = np.array([M.MARKETPLACE_SKEW.get(self.sc_names[s], 1.0) for s in self.p_sc]) * \
            np.where(self.p_oversize, 0.3, 1.0)
        for _ in range(rng.poisson(lam)):
            if self.mkt_customers and rng.random() < self.spec['customers']['marketplace_repeat_share']:
                c = self.mkt_customers[int(rng.integers(len(self.mkt_customers)))]
                state = c['state'] or M.STATE_CODES[rng.choice(len(M.STATE_CODES), p=M.STATE_W)]
            else:
                state = M.STATE_CODES[rng.choice(len(M.STATE_CODES), p=M.STATE_W)]
                t = dt.datetime.combine(day, self._rand_time())
                c = self._new_customer(day, t, 'marketplace_order', 'marketplace_only', 'marketplace', None,
                                       state if rng.random() < 0.4 else None)
                self.mkt_customers.append(c)
            p = self._pick_product(skew=skew)
            if p is None:
                continue
            lines = [p]
            if rng.random() < 0.18:
                q = self._pick_product(skew=skew, exclude=lines)
                if q is not None:
                    lines.append(q)
            lines = [(x, 1 + int(rng.random() < 0.1)) for x in lines]
            t = dt.datetime.combine(day, self._rand_time())
            self._create_order(i, day, t, 'marketplace', c, state, lines, None, 'marketplace_settlement')

    def _b2b_orders(self, i, day):
        rng = self.rng
        m = day.month
        skew = np.array([M.B2B_SKEW.get(self.sc_names[s], 1.0) for s in self.p_sc])
        for c in self.b2b:
            if c['created_date'] >= day:
                continue
            bt = c['business_type']
            sea = {'campground': {3: 2.6, 4: 2.8, 5: 2.4, 6: 1.4},
                   'outdoor_school': {8: 2.2, 9: 1.8, 1: 1.5},
                   'corporate': {11: 2.0, 12: 2.2, 6: 1.3}}[bt].get(m, 0.6)
            lam = c['b2b_rate'] * sea * 1.4 * self.sf
            if rng.random() >= lam:
                continue
            nl = int(rng.integers(2, 6))
            lines = []
            for _ in range(nl):
                p = self._pick_product(skew=skew, exclude=[x for x, _ in lines])
                if p is None:
                    continue
                cp = max(int(self.p_case[p]), 1)
                qty = int(rng.integers(2, 11))
                qty = int(math.ceil(qty / cp) * cp) if cp > 1 else qty
                lines.append((p, qty))
            if not lines:
                continue
            t = dt.datetime.combine(day, dt.time(int(rng.integers(8, 18)), int(rng.integers(60)), int(rng.integers(60))))
            self._create_order(i, day, t, 'b2b', c, c['state'], lines, None, 'net30_terms')

    def _create_order(self, i, day, t, channel, c, state, lines, camp, pay, new_customer=False):
        rng = self.rng
        spec = self.spec
        ok = len(self.orders)
        e5 = self.E5s <= day <= self.E5e and channel in ('web', 'app')
        tax_rate = M.STATES[state][1]
        if c.get('business_type') == 'outdoor_school':
            tax_rate = 0.0
        tier_before = c['tier'] if c['account_type'] == 'registered' and c['enrolled'] else None
        olines = []
        subtotal = 0.0
        for n, (p, qty) in enumerate(lines):
            lp = self.list_price(p, day)
            if channel == 'marketplace':
                up = round(lp * (1 + spec['pricing']['marketplace_listing_markup']), 2)
            elif channel == 'b2b':
                up = round(lp * (1 - spec['pricing']['b2b_contract_discount']), 2)
            else:
                up = lp
            promo = None
            disc = 0.0
            if channel != 'b2b':
                for pr, pp in self.promo_today.get(p, []):
                    cs_ = pr['channel_scope']
                    if cs_ == 'web_app' and channel not in ('web', 'app'):
                        continue
                    if cs_ == 'app_only' and channel != 'app':
                        continue
                    if channel == 'marketplace' and cs_ != 'all_channels':
                        continue
                    dd = self.line_discount(pr, pp, up, qty)
                    if dd > disc or (promo is None and pr['promotion_type'] == 'buy_x_get_y'):
                        disc, promo = dd, pr
            val = qty * up - disc
            subtotal += val
            olines.append(dict(k=len(self.lines) + n, order=ok, n=n + 1, p=p, promo=promo['k'] if promo else None,
                               qty=qty, backordered=0, cancelled=0, cancel_reason=None, cancelled_date=None,
                               list_price=lp, unit_price=up, disc=round(disc, 2),
                               tax=round(tax_rate * val, 2), cost=self.std_cost(p, day), alloc_wh=None,
                               shipped=0, first_ship=None))
        # order-level promotion
        opromo = None
        odisc = 0.0
        if channel in ('web', 'app', 'marketplace'):
            cands = []
            for pr in self.promos:
                if pr['scope'] != 'order' or not (pr['start_date'] <= day <= pr['end_date']):
                    continue
                cs_ = pr['channel_scope']
                if cs_ == 'web_app' and channel not in ('web', 'app'):
                    continue
                if cs_ == 'app_only' and channel != 'app':
                    continue
                if channel == 'marketplace' and cs_ != 'all_channels':
                    continue
                if pr['min_order_amount'] and subtotal < pr['min_order_amount']:
                    continue
                el = pr['eligibility']
                if el == 'new_customers' and not new_customer:
                    continue
                if el == 'loyalty_gold' and tier_before != 'gold':
                    continue
                if el == 'loyalty_silver_plus' and tier_before not in ('silver', 'gold'):
                    continue
                if el == 'email_subscribers' and not c['subscribed']:
                    continue
                if el == 'lapsed_customers' and not (c['last_order'] and (day - c['last_order']).days > 180):
                    continue
                if not pr['is_stackable'] and any(l['promo'] is not None for l in olines):
                    continue
                use = {'free_shipping': 1.0, 'new_customers': 0.35, 'loyalty_gold': 0.3,
                       'loyalty_silver_plus': 0.3, 'email_subscribers': 0.25, 'lapsed_customers': 0.4}
                pu = use['free_shipping'] if pr['promotion_type'] == 'free_shipping' else use.get(el, 0.3)
                if pr['channel_scope'] == 'app_only':
                    pu = 0.35
                if rng.random() < pu:
                    cands.append(pr)
            if cands:
                opromo = cands[0] if not any(x['promotion_type'] == 'free_shipping' for x in cands) else \
                    [x for x in cands if x['promotion_type'] == 'free_shipping'][0]
                if opromo['promotion_type'] == 'percent_off':
                    odisc = round(subtotal * opromo['discount_percent'], 2)
                elif opromo['promotion_type'] == 'amount_off':
                    odisc = float(opromo['discount_amount'])
        # shipping
        sh = spec['shipping']
        has_oversize = any(self.p_oversize[l['p']] for l in olines)
        if channel == 'b2b':
            method = 'freight' if has_oversize else 'standard'
            charge = 0.0 if subtotal >= 1000 else 49.0
        elif has_oversize:
            method, charge = 'freight', sh['freight_charge']
        elif channel != 'marketplace' and rng.random() < sh['expedited_share']:
            method, charge = 'expedited', sh['expedited_charge']
        else:
            method = 'standard'
            thr = sh['free_threshold']
            if channel == 'marketplace':
                charge = 0.0 if subtotal >= 35 else 5.99
            else:
                free = subtotal >= thr or (opromo is not None and opromo['promotion_type'] == 'free_shipping')
                charge = 0.0 if free else sh['standard_charge']
        ship_tax = round(charge * tax_rate, 2) if state in spec['tax']['shipping_taxable_states'] else 0.0
        # promise
        w0 = M.WH_IDS.index(M.STATES[state][2])
        zone = 1
        transit = {'standard': 4, 'expedited': 2, 'freight': 8}[method]
        pdays = spec['shipping']['promise_days']
        promised = day + TD(days=pdays['standard_weekend'] if (method == 'standard' and day.weekday() >= 4) else pdays[method])
        o = dict(k=ok, at=t, date=day, cust=c['k'], session=None, channel=channel, state=state,
                 rep=self.state_rep.get(state) if channel == 'b2b' else None, promo=opromo['k'] if opromo else None,
                 method=method, promised=promised, charge=charge, ship_tax=ship_tax, odisc=odisc, pay=pay,
                 camp=camp['k'] if camp else None, tier=tier_before, lines=[l['k'] for l in olines],
                 invoiced_shipping=False, n_ship=0, burn=day < self.start, total=0.0)
        tax_total = sum(l['tax'] for l in olines)
        o['total'] = round(subtotal - odisc + charge + ship_tax + tax_total, 2)
        # allocate order-level discount to lines by value (used by Finance on invoices)
        tot = sum(l['qty'] * l['unit_price'] - l['disc'] for l in olines) or 1.0
        for l in olines:
            l['odisc_alloc'] = odisc * (l['qty'] * l['unit_price'] - l['disc']) / tot
        self.orders.append(o)
        self.lines.extend(olines)
        # customer bookkeeping
        c['orders'] += 1
        c['last_order'] = day
        spend = subtotal - odisc
        c['spend'].append((day, spend))
        self._tier_update(c, day)
        if c['account_type'] == 'guest' and not c['subscribed'] and rng.random() < 0.03:
            c['subscribed'] = True
            c['sub_date'] = day
            c['unsub_date'] = None
        # payment failures and fraud
        fail = None
        if channel in ('web', 'app'):
            r = rng.random()
            if r < 0.006:
                fail = 'payment_failed'
            elif r < 0.009:
                fail = 'fraud_review'
        bfw = self.bf_week(day)
        o['proc'] = int(rng.choice(spec['shipping']['processing_days'])) + (1 if bfw else 0) + (1 if channel == 'b2b' else 0)
        if method == 'expedited':
            o['proc'] = spec['shipping']['expedited_processing_days'] + (1 if bfw else 0)
        for l in olines:
            self._allocate(i, day, o, l, fail)
        return o

    def _tier_update(self, c, day):
        if not (c['account_type'] == 'registered' and c['enrolled']):
            return
        lo = self.spec['customers']['loyalty']
        while c['spend'] and (day - c['spend'][0][0]).days > 365:
            c['spend'].popleft()
        s = sum(x for _, x in c['spend'])
        order = {'basic': 0, 'silver': 1, 'gold': 2}
        new = 'gold' if s >= lo['gold_spend_12m'] else 'silver' if s >= lo['silver_spend_12m'] else 'basic'
        if order[new] > order.get(c['tier'] or 'basic', 0):
            c['tier'] = new

    def _annual_tier_review(self, day):
        lo = self.spec['customers']['loyalty']
        for c in self.cust:
            if c['account_type'] == 'registered' and c['enrolled']:
                while c['spend'] and (day - c['spend'][0][0]).days > 365:
                    c['spend'].popleft()
                s = sum(x for _, x in c['spend'])
                c['tier'] = 'gold' if s >= lo['gold_spend_12m'] else 'silver' if s >= lo['silver_spend_12m'] else 'basic'

    # ------------------------------------------------------------------ allocation and fulfilment
    def _allocate(self, i, day, o, l, fail):
        rng = self.rng
        p, qty = l['p'], l['qty']
        sw = self.serving_wh(o['state'], p)
        # planners forecast from consumer demand; a B2B bulk line counts at most 2 units (deals are planned separately)
        self.demand_today[sw, p] += min(qty, 2) if o['channel'] == 'b2b' else qty
        if fail == 'payment_failed':
            l['cancelled'] = qty
            l['cancel_reason'] = 'payment_failed'
            l['cancelled_date'] = day
            return
        ship_day = self.ship_day_after(day, o['proc'])
        order_w = [sw] + [w for w in (1, 2, 0) if w != sw]
        if self.available(sw, p) >= qty:
            self._make_alloc(o, l, sw, qty, ship_day)
            l['alloc_wh'] = sw
        else:
            reserve = self.ev['E3']['other_warehouse_reserve_units']
            alt = [w for w in order_w[1:] if self.available(w, p) >= qty + reserve]
            if alt and self.available(sw, p) <= 0 and rng.random() < self.ev['E3']['oos_backorder_share_when_alt']                     and o['channel'] in ('web', 'app'):
                alt = []   # the site promised "ships from your nearest warehouse when back in stock"
            if alt:
                w = alt[0]
                self._make_alloc(o, l, w, qty, self.ship_day_after(ship_day, 0))
                l['alloc_wh'] = w
            else:
                have = max(self.available(sw, p), 0)
                rest = qty - have
                if have > 0:
                    self._make_alloc(o, l, sw, have, ship_day)
                l['alloc_wh'] = sw
                backorder = o['channel'] == 'b2b' or rng.random() < 0.5
                if backorder:
                    l['backordered'] = rest
                    self.backorders.append(dict(o=o, l=l, w=sw, qty=rest, since=day, local=o['channel'] in ('web', 'app')))
                else:
                    l['cancelled'] += rest
                    l['cancel_reason'] = 'out_of_stock'
                    l['cancelled_date'] = day
        if fail == 'fraud_review':
            for a in [a for lst in self.allocs.values() for a in lst if a['l'] is l]:
                self.sched[i + 1].append(('cancel_alloc', a))
            for b in [b for b in self.backorders if b['l'] is l]:
                self.backorders.remove(b)
                l['cancelled'] += b['qty']
                l['cancelled_date'] = day + TD(days=1)
            l['cancel_reason'] = 'fraud_review'
            l['_fraud'] = True
        elif o['channel'] in ('web', 'app') and rng.random() < 0.015:
            for a in [a for lst in self.allocs.values() for a in lst if a['l'] is l]:
                gap = (a['ship'] - day).days
                if gap >= 2:
                    self.sched[i + int(rng.integers(1, gap))].append(('cancel_alloc', a))

    def _make_alloc(self, o, l, w, qty, ship_day):
        a = dict(o=o, l=l, w=w, p=l['p'], qty=qty, ship=ship_day, done=False)
        self.reserved[w, l['p']] += qty
        self.allocs[ship_day].append(a)
        return a

    def _cancel_alloc(self, a, day, reason):
        if a['done'] or a.get('cancelled'):
            return
        lst = self.allocs.get(a['ship'], [])
        if a in lst:
            lst.remove(a)
        else:
            return
        a['cancelled'] = True
        self.reserved[a['w'], a['p']] -= a['qty']
        l = a['l']
        l['cancelled'] += a['qty']
        if l['cancel_reason'] is None or l.get('_fraud'):
            l['cancel_reason'] = 'fraud_review' if l.get('_fraud') else reason
        l['cancelled_date'] = day

    def _fill_backorders(self, i, day):
        rng = self.rng
        keep = []
        to = self.spec['replenishment']['backorder_timeout_days']
        for b in self.backorders:
            l, o = b['l'], b['o']
            age = (day - b['since']).days
            if age >= to or (o['channel'] != 'b2b' and rng.random() < 0.01):
                l['cancelled'] += b['qty']
                if l['cancel_reason'] is None:
                    l['cancel_reason'] = 'backorder_timeout' if age >= to else 'customer_request'
                l['cancelled_date'] = day
                continue
            p = b['p'] if 'p' in b else l['p']
            ws = [b['w']] if b.get('local') else [b['w']] + [w for w in range(3) if w != b['w']]
            filled = False
            for w in ws:
                av = self.available(w, p)
                if av >= b['qty']:
                    self._make_alloc(o, l, w, b['qty'], self.ship_day_after(day, 1))
                    filled = True
                    break
            if not filled:
                keep.append(b)
        self.backorders = keep

    def _ship(self, i, day):
        allocs = self.allocs.pop(day, [])
        if not allocs:
            return
        groups = collections.OrderedDict()
        for a in allocs:
            if a.get('cancelled'):
                continue
            key = (a['o']['k'], a['w'])
            groups.setdefault(key, []).append(a)
        for (ok, w), lst in groups.items():
            o = lst[0]['o']
            ovs = any(self.p_oversize[a['p']] for a in lst)
            for a in lst:
                a['done'] = True
                self.on_hand[w, a['p']] -= a['qty']
                self.reserved[w, a['p']] -= a['qty']
                self.mv['ship'][w, a['p']] += a['qty']
                assert self.on_hand[w, a['p']] >= 0, (w, a['p'], day)
            if o['burn']:
                for a in lst:
                    if self.defective[w, a['p']] > 0:
                        self.defective[w, a['p']] = min(self.defective[w, a['p']], self.on_hand[w, a['p']])
                continue
            self._record_shipment(i, day, o, w, ovs, lst)

    # ------------------------------------------------------------------ shipments, invoices, returns
    def _record_shipment(self, i, day, o, w, ovs, lst):
        rng = self.rng
        o['n_ship'] += 1
        wh = M.WH_IDS[w]
        service = 'ltl_freight' if (ovs or o['method'] == 'freight') else ('two_day' if o['method'] == 'expedited' else 'ground')
        carrier = M.carrier_for(wh, service, day, self.E8)
        late_p, extra, cf = M.CARRIER_PROFILE[carrier]
        zone = M.ZONE[(wh, M.STATES[o['state']][2])]
        base = {'ground': {1: 2, 2: 3, 3: 5}, 'two_day': {1: 2, 2: 2, 3: 2}, 'ltl_freight': {1: 4, 2: 6, 3: 8}}[service][zone]
        eta = day + TD(days=base + int(round(extra)))
        lp = late_p + (0.08 if self.bf_week(day) else 0.0)
        if carrier == 'CAR-04':
            lp = self.ev['E8']['late_probability_new'] + (0.05 if self.bf_week(day) else 0)
            delay = int(rng.integers(self.ev['E8']['extra_delay_days'][0], self.ev['E8']['extra_delay_days'][1] + 1))
        else:
            delay = int(rng.integers(1, 4))
        r = rng.random()
        if r < lp:
            deliv = eta + TD(days=delay)
        elif r < lp + 0.15:
            deliv = eta - TD(days=1)
        else:
            deliv = eta
        status = 'delivered'
        r2 = rng.random()
        if r2 < 0.0025:
            status, deliv = 'lost', None
        elif r2 < 0.004:
            status, deliv = 'returned_to_sender', None
        if deliv is not None and deliv > self.end:
            status, deliv = 'in_transit', None
        units = sum(a['qty'] for a in lst)
        wt = sum(self.p_weight[a['p']] * a['qty'] for a in lst)
        billed = round(wt * rng.uniform(1.0, 1.35), 4)
        zf = {1: 1.0, 2: 1.25, 3: 1.55}[zone]
        if service == 'ltl_freight':
            cost = (70 + 0.42 * billed * zf) * cf
        else:
            cost = (5.2 + 0.62 * billed ** 0.9 * zf) * cf * (1.9 if service == 'two_day' else 1.0)
        shipped_at = dt.datetime.combine(day, dt.time(int(rng.integers(13, 19)), int(rng.choice([0, 10, 20, 30, 40, 50])), 0))
        if o.get('last_ship_at') is not None and o['last_ship_at'].date() == day and shipped_at <= o['last_ship_at']:
            shipped_at = o['last_ship_at'] + TD(minutes=10)
        o['last_ship_at'] = shipped_at
        sh = dict(k=len(self.R['shipments']), order=o['k'], n=o['n_ship'], w=w, carrier=carrier, service=service,
                  at=shipped_at, date=day, eta=eta, deliv=deliv,
                  deliv_at=dt.datetime.combine(deliv, dt.time(int(rng.integers(9, 20)), int(rng.integers(60)), 0)) if deliv else None,
                  status=status, packages=max(1, int(math.ceil(units / 3))) if service != 'ltl_freight' else max(1, units),
                  billed=billed, freight=round(cost * rng.uniform(0.95, 1.05), 2), cust=o['cust'], state=o['state'],
                  order_date=o['date'], promised=o['promised'])
        self.R['shipments'].append(sh)
        # invoice
        first = not o['invoiced_shipping']
        o['invoiced_shipping'] = True
        inv = dict(k=len(self.R['invoices']), order=o['k'], shipment=sh['k'], cust=o['cust'], channel=o['channel'],
                   state=o['state'], date=day, terms={'b2b': 'net30', 'marketplace': 'marketplace_settlement'}.get(o['channel'], 'prepaid'),
                   ship_billed=o['charge'] if first else 0.0, ship_tax=o['ship_tax'] if first else 0.0,
                   camp=o['camp'], region=self.region(o['state'], day), fm=self.fiscal_month(day), fee=0.0)
        inv['due'] = day + TD(days=30) if inv['terms'] == 'net30' else (day + TD(days=14) if inv['terms'] == 'marketplace_settlement' else day)
        self.R['invoices'].append(inv)
        merch = 0.0
        late = deliv is not None and deliv > o['promised']
        for a in lst:
            l = a['l']
            q = a['qty']
            frac = q / l['qty']
            sl = dict(k=len(self.R['shipment_lines']), shipment=sh['k'], line=l['k'], p=l['p'], w=w, date=day, qty=q)
            self.R['shipment_lines'].append(sl)
            disc = round((l['disc'] + l['odisc_alloc']) * frac, 2)
            il = dict(k=len(self.R['invoice_lines']), invoice=inv['k'], line=l['k'], p=l['p'], qty=q,
                      unit_price=l['unit_price'], disc=disc, tax=round(l['tax'] * frac, 2),
                      cost=self.std_cost(l['p'], day))
            self.R['invoice_lines'].append(il)
            merch += q * l['unit_price'] - disc
            l['shipped'] += q
            if l['first_ship'] is None:
                l['first_ship'] = sh['k']
                l['first_invoice'] = inv['k']
            # E9 defective units shipped
            bad = 0
            if self.defective[w, l['p']] > 0:
                share = self.defective[w, l['p']] / max(self.on_hand[w, l['p']] + q, 1)
                bad = int(rng.binomial(q, min(share, 1.0)))
                self.defective[w, l['p']] = max(self.defective[w, l['p']] - bad, 0)
            self._maybe_return(o, l, sh, il, q, bad, late)
        if o['channel'] == 'marketplace':
            inv['fee'] = round(self.ev['E2']['marketplace_fee_rate'] * (merch + inv['ship_billed']), 2)
        self._maybe_tickets(o, sh, late)
        if late and o['channel'] in ('web', 'app'):
            self.cust_penalty_from[o['cust']] = self.di(deliv)
            if carrier == 'CAR-04':
                self.truth['E8_late_shipments'].append(sh['k'])

    def _maybe_return(self, o, l, sh, il, qty, bad, late):
        rng = self.rng
        if sh['deliv'] is None:
            return
        rs = self.spec['returns']
        cat = self.p_cat[l['p']]
        sc = self.sc_names[self.p_sc[l['p']]]
        window = self.ev['E4']['window_after'] if sh['deliv'] >= self.E4 else self.ev['E4']['window_before']
        events = []
        p_base = rs['base_rate_by_category'][cat]
        if o['channel'] == 'b2b':
            p_base *= 0.3
        if rng.random() < p_base:
            mix = rs['reason_mix_apparel'] if cat == 'outdoor_apparel' else rs['reason_mix_default']
            reason = rng.choice(list(mix), p=np.array(list(mix.values())) / sum(mix.values()))
            if cat == 'outdoor_apparel' and reason == 'wrong_size' and self.products[l['p']]['size'] in ('S', 'XL', '8', '11'):
                pass
            lag = min(int(rng.lognormal(rs['lag_days_lognormal']['mean_log'], rs['lag_days_lognormal']['sigma'])), 29)
            events.append((str(reason), max(lag, 0)))
        if window == 60:
            extra = self.ev['E4']['extra_changed_mind_rate'].get(cat, self.ev['E4']['extra_changed_mind_rate']['default'])
            if o['channel'] == 'b2b':
                extra *= 0.3
            if rng.random() < extra:
                lo, hi = self.ev['E4']['extra_lag_days_uniform']
                events.append(('changed_mind', int(rng.integers(lo, hi + 1))))
        if late and rng.random() < 0.045:
            events.append(('arrived_late', int(rng.integers(0, 6))))
        if bad > 0 and rng.random() < self.ev['E9']['defective_return_probability']:
            events.append(('defective', int(rng.integers(5, 26))))
            self.truth['E9_defective_returns'].append(l['k'])
        if not events:
            return
        reason, lag = events[0] if len(events) == 1 else sorted(events, key=lambda e: e[1])[0]
        if reason == 'defective' and bad > 0:
            qreq = bad
        else:
            qreq = qty if (qty == 1 or rng.random() < 0.6) else 1
        qreq = min(qreq, qty)
        req_date = sh['deliv'] + TD(days=lag)
        if req_date > self.end:
            return
        req_at = dt.datetime.combine(req_date, self._rand_time())
        unit_net = (l['qty'] * l['unit_price'] - l['disc'] - l['odisc_alloc']) / l['qty']
        ret = dict(k=len(self.R['returns']), order=o['k'], line=l['k'], p=l['p'], cust=o['cust'], w=None,
                   req_at=req_at, req_date=req_date, recv=None, window=window, reason=reason, qreq=qreq, qrecv=0,
                   cond=None, qrest=0, rest_date=None, cost=0.0, order_date=o['date'], shipped=sh['date'],
                   deliv=sh['deliv'], status='requested', sh=sh)
        oversize = self.p_oversize[l['p']]
        if o['channel'] == 'marketplace':
            ret['method'] = 'marketplace_return'
            ret['cost'] = round(rng.uniform(6, 11), 2)
        elif oversize:
            ret['method'] = 'freight_pickup'
            ret['cost'] = round(rng.uniform(60, 130), 2)
        elif reason in ('changed_mind', 'other') and rng.random() < 0.5:
            ret['method'] = 'customer_shipped'
        else:
            ret['method'] = 'prepaid_label'
            ret['cost'] = round(rng.uniform(6.5, 12.5), 2)
        returnless = unit_net < rs['returnless_value_under'] and not oversize and rng.random() < 0.7
        refund_parts = []
        if returnless:
            ret['status'] = 'closed'
            ret['cost'] = 0.0
            ret['method'] = 'customer_shipped' if ret['method'] != 'marketplace_return' else ret['method']
            rdate = req_date + TD(days=int(rng.integers(0, 2)))
            refund_parts.append(('returnless', rdate, qreq))
        elif rng.random() < rs['receive_share']:
            recv = req_date + TD(days=int(rng.integers(4, 11)))
            if recv > self.end:
                ret['status'] = 'in_transit'
            else:
                ret['recv'] = recv
                ret['qrecv'] = qreq
                ret['w'] = self.serving_wh(o['state'], l['p'])
                cond = {'defective': 'defective', 'damaged_in_transit': 'damaged' if rng.random() < 0.7 else 'resellable',
                        'not_as_described': 'resellable' if rng.random() < 0.7 else 'damaged'}.get(
                    reason, 'resellable' if rng.random() < 0.92 else 'damaged')
                ret['cond'] = cond
                if cond == 'resellable':
                    rd = recv + TD(days=int(rng.integers(1, 4)))
                    if rd <= self.end:
                        ret['qrest'] = qreq
                        ret['rest_date'] = rd
                        self.sched[self.di(rd)].append(('restock', ret['w'], l['p'], qreq))
                rejected = cond == 'damaged' and reason in ('changed_mind', 'wrong_size') and rng.random() < 0.5
                if rejected:
                    ret['status'] = 'rejected'
                else:
                    rdate = recv + TD(days=int(rng.integers(1, 5)))
                    if rdate > self.end:
                        ret['status'] = 'received'
                    else:
                        ret['status'] = 'closed'
                        refund_parts.append(('return', rdate, qreq))
        else:
            ret['status'] = 'requested' if (self.end - req_date).days < 21 else 'closed'
            ret['method'] = 'customer_shipped' if ret['method'] == 'prepaid_label' else ret['method']
            ret['cost'] = 0.0 if ret['method'] == 'customer_shipped' else ret['cost']
        self.R['returns'].append(ret)
        mk = 0.1 if o['channel'] == 'marketplace' else 1.0
        tp = {'damaged_in_transit': ('damaged_item', 0.5), 'defective': ('defective_item', 0.55),
              'wrong_size': ('sizing_fit', 0.25)}.get(reason)
        if tp and rng.random() < tp[1] * mk:
            self._ticket(o, sh, tp[0], req_date - TD(days=int(rng.integers(0, 2))), product=l['p'])
        elif rng.random() < 0.12 * mk:
            self._ticket(o, sh, 'return_request', req_date, product=l['p'])
        for (rtype, rdate, q) in refund_parts:
            self._refund(o, l, ret, rtype, rdate, q, unit_net)
            if rng.random() < 0.08 * mk:
                self._ticket(o, None, 'refund_status', rdate + TD(days=int(rng.integers(2, 10))))

    def _refund(self, o, l, ret, rtype, rdate, q, unit_net, ticket=None, amount=None):
        rng = self.rng
        if rdate > self.end:
            return
        merch = round(unit_net * q, 2) if amount is None else amount
        tax = round(l['tax'] / l['qty'] * q, 2) if (l is not None and amount is None) else 0.0
        ship = 0.0
        if rtype == 'shipping_refund':
            merch, tax = 0.0, 0.0
            ship = o['charge'] if o['charge'] > 0 else 0.0
            if ship == 0:
                return
        if ret is not None and ret['reason'] == 'arrived_late' and o['charge'] > 0 and not o.get('ship_refunded'):
            ship = o['charge']
            o['ship_refunded'] = True
        if o['channel'] == 'marketplace':
            methods = ['marketplace']
        elif rtype in ('return', 'returnless') and rng.random() < self.spec['returns']['split_refund_share']:
            methods = ['store_credit', 'original_payment']
        else:
            methods = ['store_credit' if rng.random() < self.spec['returns']['store_credit_share'] else 'original_payment']
        parts = len(methods)
        for j, m in enumerate(methods):
            share = 0.5 if parts == 2 else 1.0
            rf = dict(k=len(self.R['refunds']), ret=ret['k'] if ret else None, order=o['k'],
                      line=l['k'] if l is not None else None, ticket=ticket, type=rtype, method=m,
                      at=dt.datetime.combine(rdate, self._rand_time()), date=rdate,
                      merch=round(merch * share, 2), tax=round(tax * share, 2), ship=round(ship * share, 2),
                      qty=(q if (j == parts - 1) else 0) if rtype == 'return' else 0, o=o, l=l)
            self.R['refunds'].append(rf)

    def _maybe_tickets(self, o, sh, late):
        rng = self.rng
        mk = 0.1 if o['channel'] == 'marketplace' else (0.5 if o['channel'] == 'b2b' else 1.0)
        if sh['status'] == 'lost' or (late and rng.random() < 0.40 * mk) or (not late and rng.random() < 0.035 * mk):
            base = sh['promised'] if sh['deliv'] is None or late else sh['date'] + TD(days=2)
            cday = base + TD(days=int(rng.integers(0, 3)))
            self._ticket(o, sh, 'where_is_my_order', cday, late=late)
        if o['channel'] in ('web', 'app') and rng.random() < 0.004:
            self._ticket(o, None, 'billing', o['date'] + TD(days=int(rng.integers(1, 20))))

    def _ticket(self, o, sh, cat, cday, late=False, product=None, defect=False):
        rng = self.rng
        if cday > self.end:
            return None
        created = dt.datetime.combine(cday, self._rand_time())
        pri = 'high' if cat in ('damaged_item', 'defective_item') or (cat == 'where_is_my_order' and late) else \
            ('low' if cat in ('product_question', 'other') else 'normal')
        method = rng.choice(['email', 'chat', 'phone', 'web_form'], p=[0.3, 0.35, 0.2, 0.15])
        fr = created + TD(hours=float(rng.lognormal(1.2 if method in ('chat', 'phone') else 2.6, 0.8)))
        res_days = float(rng.lognormal(0.4 if cat in ('product_question', 'billing') else 1.0, 0.7))
        resolved = fr + TD(days=res_days)
        resolution = {
            'where_is_my_order': ['info_provided', 'escalated_to_carrier', 'refund_issued'],
            'damaged_item': ['replacement_sent', 'refund_issued', 'return_authorized'],
            'defective_item': ['return_authorized', 'replacement_sent', 'refund_issued'],
            'sizing_fit': ['info_provided', 'return_authorized'],
            'return_request': ['return_authorized', 'info_provided'],
            'refund_status': ['info_provided'],
            'billing': ['info_provided', 'refund_issued', 'no_action'],
            'product_question': ['info_provided', 'no_action'],
            'other': ['info_provided', 'no_action'],
        }[cat]
        rp = {'where_is_my_order': [0.55 if late else 0.8, 0.3 if late else 0.18, 0.15 if late else 0.02],
              'damaged_item': [0.4, 0.3, 0.3], 'defective_item': [0.5, 0.3, 0.2]}.get(cat)
        resol = rng.choice(resolution, p=rp) if rp else rng.choice(resolution)
        csat = None
        if rng.random() < 0.35:
            mean = 4.3
            if cat == 'where_is_my_order' and late:
                mean = 2.7 if (sh is not None and sh['carrier'] == 'CAR-04') else 3.1
            elif cat in ('defective_item', 'damaged_item'):
                mean = 3.2
            csat = int(np.clip(round(rng.normal(mean, 0.9)), 1, 5))
        if resolved.date() > self.end:
            resolved = None
            resol = None
            csat = None
        t = dict(k=len(self.R['support_tickets']), cust=o['cust'] if o else None, order=o.get('k') if o else None,
                 p=product, method=str(method), cat=cat, pri=pri, created=created,
                 first=fr if fr.date() <= self.end else None, resolved=resolved, resolution=resol,
                 reopened=int(rng.random() < 0.06) + int(rng.random() < 0.01), csat=csat,
                 sh=sh['k'] if sh else None, carrier=sh['carrier'] if sh else None)
        self.R['support_tickets'].append(t)
        if resol == 'refund_issued' and o is not None and o.get('k') is not None and resolved is not None:
            rdate = resolved.date()
            if cat == 'where_is_my_order':
                self._refund(o, None, None, 'shipping_refund', rdate, 0, 0, ticket=t['k'])
                if o['charge'] == 0:
                    self._refund(o, None, None, 'goodwill', rdate, 0, 0, ticket=t['k'], amount=round(float(rng.uniform(5, 15)), 2))
            elif cat in ('damaged_item', 'defective_item'):
                self._refund(o, None, None, 'goodwill', rdate, 0, 0, ticket=t['k'], amount=round(float(rng.uniform(15, 45)), 2))
            elif cat == 'billing':
                self._refund(o, None, None, 'price_adjustment', rdate, 0, 0, ticket=t['k'], amount=round(float(rng.uniform(5, 30)), 2))
        return t

    # ------------------------------------------------------------------ supply
    def _replenish(self, i, day):
        rng = self.rng
        rp = self.spec['replenishment']
        e3 = self.ev['E3']
        # group candidate lines by (supplier, warehouse)
        todo = collections.defaultdict(list)
        for p in range(self.P):
            disc = self.p_disc[p]
            if disc is not None and day >= disc:
                continue
            launch = self.p_launch[p]
            sup = self.supplier_of(p, day)
            sp = self.suppliers[sup]
            overseas = sp['country_code'] not in ('US',)
            lt = sp['default_lead_time_days']
            if launch > day + TD(days=lt + 20):
                continue
            review = rp['review_days']['overseas' if overseas else 'domestic']
            key = (sup,)
            if (i + zlib.crc32(sup.encode()) % review) % review != 0:
                continue
            safety = rp['safety_days']['overseas' if overseas else 'domestic']
            for w in range(3):
                if not self.stocked[w, p]:
                    continue
                bo = sum(b['qty'] for b in self.backorders if b['w'] == w and b['l']['p'] == p)
                pos = self.on_hand[w, p] - self.reserved[w, p] + self.on_order[w, p] - bo
                f0 = self.ema[w, p]
                c = self.p_index_cum[p]
                ramp = (c[i + lt + review + 30] - c[i + lt]) / 30 > 1.3 * max(self.p_index[p, i], 1e-6)
                if ramp:
                    f0 = f0 * rp['seasonal_build_bias']
                rop = f0 * (c[i + lt + review] - c[i]) + f0 * (c[i + lt + review + safety] - c[i + lt + review])
                rop += max(rp['min_stock_units'], self.ema[w, p] * rp['min_cover_base_days'])
                tgt = rop + f0 * (c[i + lt + review + safety + review] - c[i + lt + review + safety])
                if pos < rop:
                    q = tgt - pos
                    cp = max(int(self.p_case[p]), 1)
                    q = int(math.ceil(q / cp) * cp)
                    if q <= 0:
                        continue
                    ahead = (c[i + lt + review + 30] - c[i + lt]) / 30
                    now = max(self.p_index[p, i], 1e-6)
                    ptype = 'new_launch' if launch > day else ('seasonal_buy' if ahead > 1.4 * now else 'replenishment')
                    todo[(sup, w)].append((p, q, ptype))
        # E3 expedite from secondary supplier for WH-W tents that are short
        if d_(e3['expedite_start']) <= day <= D(2024, 9, 30) and day.weekday() == 2:
            for p in range(self.P):
                if self.sc_names[self.p_sc[p]] == 'tents' and self.supplier_of(p, day) == e3['main_tent_supplier']:
                    w = 0
                    if self.available(w, p) <= 0 and self.rng.random() < 0.3:
                        todo[(e3['secondary_supplier'], w)].append((p, int(e3['expedite_line_cap']), 'expedite'))
        for (sup, w), lines in todo.items():
            self._make_po(i, day, sup, w, lines)

    def _make_po(self, i, day, sup, w, lines):
        rng = self.rng
        sp = self.suppliers[sup]
        e3, e9, e12 = self.ev['E3'], self.ev['E9'], self.ev['E12']
        overseas = sp['country_code'] != 'US'
        ptypes = [t for _, _, t in lines]
        ptype = 'expedite' if 'expedite' in ptypes else ('new_launch' if 'new_launch' in ptypes else
                                                        ('seasonal_buy' if 'seasonal_buy' in ptypes else 'replenishment'))
        units = sum(q for _, q, _ in lines)
        if ptype == 'expedite':
            mode = 'air'
            freight = round(900 + 6.5 * units * rng.uniform(0.9, 1.1), 2)
        elif overseas:
            mode = 'ocean'
            freight = round(1400 + 1.1 * units * rng.uniform(0.8, 1.2), 2)
        elif sp['freight_terms'] == 'fob_origin':
            mode = 'truckload' if units > 300 else 'ltl'
            freight = round((650 if mode == 'truckload' else 180) + 0.6 * units * rng.uniform(0.8, 1.2), 2)
        else:
            mode = 'truckload' if units > 400 else ('ltl' if units > 40 else 'parcel')
            freight = 0.0
        po = dict(k=len(self.R['purchase_orders']), sup=sup, w=w, date=day, type=ptype, mode=mode, freight=freight,
                  lines=[])
        self.R['purchase_orders'].append(po)
        lt = sp['default_lead_time_days']
        for (p, q, t) in lines:
            if overseas:
                act = lt * rng.lognormal(np.log(self.spec['replenishment']['quoted_vs_actual_lead_overseas']), 0.08)
            else:
                act = lt * rng.uniform(0.8, 1.3)
            if ptype == 'expedite':
                act = rng.uniform(7, 13)
            e3_hit = sup == e3['main_tent_supplier'] and d_(e3['po_dates'][0]) <= day <= d_(e3['po_dates'][1])
            if e3_hit:
                act *= e3['lead_time_multiplier'] if w == 0 else e3['other_warehouses_multiplier']
                if w == 0:
                    self.truth['E3_po_lines'].append(len(self.R['purchase_order_lines']))
            act = int(round(act))
            req = day + TD(days=lt - int(rng.integers(0, 4)))
            prom = day + TD(days=lt + int(rng.integers(0, 3)))
            # E12: supplier short-closes lines of products featured in spring 2025 promotions
            short = 0
            if d_(e12['short_close_po_dates'][0]) <= day <= d_(e12['short_close_po_dates'][1]) and p in self.e12_products:
                short = int(q * e12['supplier_short_close_share'])
                self.truth['E12_short_closed_lines'].append(len(self.R['purchase_order_lines']))
            elif e3_hit and w == 0:
                short = int(q * e3['wh_w_short_ship_share'])
            elif rng.random() < 0.02:
                short = int(q * rng.uniform(0.1, 0.5))
            pol = dict(k=len(self.R['purchase_order_lines']), po=po['k'], p=p, qty=q, cancelled=short,
                       cost=self.po_unit_cost(p, day, sup), req=req, prom=prom, receipts=[])
            self.R['purchase_order_lines'].append(pol)
            po['lines'].append(pol['k'])
            self.on_order[w, p] += q
            # deliveries
            to_ship = q - short
            nd = 1 if to_ship <= 12 else int(rng.choice([1, 2, 3], p=[0.75, 0.18, 0.07]))
            parts = [to_ship // nd] * nd
            parts[0] += to_ship - sum(parts)
            arr = day + TD(days=act)
            last_recv = None
            for j, part in enumerate(parts):
                if part <= 0:
                    continue
                recv = arr + TD(days=int(j * rng.integers(3, 11)))
                stop = None
                if sup == e3['main_tent_supplier'] and w == 0:
                    stop = e3['receipt_stop']
                elif p in self.e12_products:
                    stop = e12['receipt_stop']
                if stop and d_(stop[0]) <= recv <= d_(stop[1]):
                    recv = d_(stop[1]) + TD(days=int(rng.integers(1, 11)))
                    self.truth['receipt_stop_shifted'].append(len(self.R['receipts']))
                transit = {'ocean': int(rng.integers(24, 34)), 'air': 3, 'truckload': int(rng.integers(2, 5)),
                           'ltl': int(rng.integers(3, 6)), 'parcel': int(rng.integers(2, 4))}[mode]
                ship_d = recv - TD(days=transit)
                if ship_d < day:
                    ship_d = day
                rej = 0
                reason = None
                bad = 0
                if rng.random() < 0.12:
                    rej = int(rng.binomial(part, 0.06))
                    reason = rng.choice(['defect', 'damaged_in_transit', 'wrong_item', 'short_shelf_life'],
                                        p=[0.35, 0.4, 0.2, 0.05])
                e9_hit = self.on('E9') and sup == e9['supplier'] and self.sc_names[self.p_sc[p]] == e9['subcategory'] and \
                    d_(e9['lot_received'][0]) <= recv <= d_(e9['lot_received'][1])
                if e9_hit:
                    rej = int(part * rng.uniform(*e9['inspection_reject']))
                    reason = 'defect'
                    bad = int((part - rej) * e9['defective_share_of_accepted'])
                    self.truth['E9_receipts'].append(len(self.R['receipts']))
                if rej == 0:
                    reason = None
                acc = part - rej
                pa_days = int(rng.choice(self.spec['replenishment']['putaway_days'])) + (1 if recv.month in (11, 12) else 0)
                putaway = recv + TD(days=pa_days) if acc > 0 else None
                lot = f"LOT-{sup.replace('-', '')}-{ship_d.strftime('%y%m')}-{int(rng.integers(1, 9)):02d}"
                if e9_hit:
                    lot = f"LOT-{sup.replace('-', '')}-2507-03"
                rc = dict(k=len(self.R['receipts']), pol=pol['k'], po=po['k'], w=w, p=p, sup=sup, lot=lot,
                          ship=ship_d, recv=recv, recv_at=dt.datetime.combine(recv, dt.time(int(rng.integers(6, 16)), int(rng.integers(60)), 0)),
                          putaway=putaway, qrecv=part, qacc=acc, qrej=rej, reason=reason)
                self.R['receipts'].append(rc)
                pol['receipts'].append(rc['k'])
                self.sched[self.di(recv)].append(('dock', w, p, part))
                if putaway is not None:
                    self.sched[self.di(putaway)].append(('putaway', w, p, acc, bad))
                last_recv = recv
            if short:
                cdate = last_recv if last_recv is not None else day
                self.sched[self.di(cdate)].append(('po_cancel', w, p, short))
                pol['cancel_date'] = cdate

    def _adjustments(self, i, day):
        rng = self.rng
        W, P = self.on_hand.shape
        mask = (rng.random((W, P)) < 0.004) & self.stocked
        for w, p in zip(*np.nonzero(mask)):
            av = self.on_hand[w, p] - self.reserved[w, p]
            if av <= 0:
                continue
            delta = int(rng.choice([-3, -2, -1, -1, -1, 1, 1, 2]))
            delta = max(delta, -av)
            if delta:
                self.on_hand[w, p] += delta
                self.mv['adj'][w, p] += delta
        # E9 write-off of defective stock
        e9 = self.ev['E9']
        if self.on('E9') and d_(e9['write_off_window'][0]) <= day <= d_(e9['write_off_window'][1]) and day.weekday() == 0:
            for w in range(W):
                for p in range(P):
                    if self.defective[w, p] > 0:
                        av = self.on_hand[w, p] - self.reserved[w, p]
                        q = min(int(self.defective[w, p] * rng.uniform(*e9['write_off_share'])) + 1, av)
                        if q > 0:
                            self.on_hand[w, p] -= q
                            self.defective[w, p] -= min(q, self.defective[w, p])
                            self.mv['adj'][w, p] -= q
                            self.truth['E9_write_offs'].append((str(day), M.WH_IDS[w], self.products[p]['product_id'], q))
        self.defective = np.minimum(self.defective, self.on_hand)

    def _snapshot(self, i, day):
        oh = self.on_hand
        movement = (self.mv['recv'] | self.mv['ship'] | self.mv['restock'] | self.mv['adj']) != 0
        launched = np.array([self.p_launch[p] <= day for p in range(self.P)])
        live = np.array([(self.p_disc[p] is None or day <= self.p_disc[p]) for p in range(self.P)])
        rows = self.stocked & ((launched & live)[None, :] | (oh > 0) | (self.on_order > 0) | movement)
        ws, ps = np.nonzero(rows)
        self.inv_rows.append((day, ws.astype(np.int8), ps.astype(np.int16), oh[ws, ps].copy(),
                              self.on_order[ws, ps].copy(), self.mv['recv'][ws, ps].copy(),
                              self.mv['ship'][ws, ps].copy(), self.mv['restock'][ws, ps].copy(),
                              self.mv['adj'][ws, ps].copy()))

    def _campaign_daily(self, i, day):
        if day < self.start:
            return
        rng = self.rng
        ai = self.spec['attribution_inflation']
        cpc = self.spec['cost_per_click']
        ctr = {'paid_search': 0.035, 'paid_social': 0.009, 'display': 0.0025, 'affiliate': 0.012}
        for ch, lst in self.camp_today.items():
            for c in lst:
                st = self.camp_stats.get(c['k'])
                if ch in ('email', 'push_notification'):
                    if not st or not st.get('sent'):
                        continue
                    clicks = st['clicks']
                    imp = 0
                    spend = st['sent'] * (0.0025 if ch == 'email' else 0.0010)
                    infl = ai['email'] if ch == 'email' else ai['push_notification']
                elif ch == 'marketplace_ads':
                    mk = [o for o in self.orders[-400:] if o['date'] == day and o['channel'] == 'marketplace']
                    conv = int(rng.binomial(len(mk), 0.35)) if mk else 0
                    val = round(sum(o['total'] for o in mk) / max(len(mk), 1) * conv, 2)
                    clicks = int(conv / 0.08 * rng.uniform(0.8, 1.2)) if conv else int(rng.integers(5, 40))
                    imp = int(clicks / 0.006)
                    self.R['campaign_daily'].append(dict(camp=c['k'], date=day, imp=imp, clicks=clicks, sent=None,
                                                         delivered=None, opened=None, unsub=None,
                                                         spend=round(val * 0.10, 2), conv=conv, val=val))
                    continue
                else:
                    sess = st['sessions'] if st else 0
                    clicks = int(round(sess / self.spec['click_to_session'] * rng.uniform(0.95, 1.08)))
                    if clicks == 0:
                        clicks = int(rng.poisson(1.5))
                    imp = int(clicks / ctr[ch] * rng.uniform(0.85, 1.15))
                    if ch == 'paid_social':
                        infl = ai['paid_social_retargeting'] if c['audience_type'] == 'retargeting' else ai['paid_social_prospecting']
                    else:
                        infl = ai[ch]
                    if ch == 'display':
                        spend = imp / 1000 * 2.9
                        if c['audience_type'] == 'retargeting':
                            spend *= self.spec['retargeting_cost_multiplier']
                        spend *= 0.83   # v3: display CPM 2.4
                    elif ch == 'affiliate':
                        spend = None
                    else:
                        spend = clicks * cpc[ch] * rng.uniform(0.9, 1.1)
                        if c['audience_type'] == 'retargeting':
                            spend *= self.spec['retargeting_cost_multiplier']
                orders = st['orders'] if st else []
                n_orders = len(orders)
                conv = int(rng.poisson(n_orders * infl)) if n_orders else int(rng.poisson(0.3 * infl if ch in ('display', 'paid_social') else 0.05))
                vt = self.spec['view_through_claim_share'].get(ch)
                if vt:   # view-through: platforms also claim orders that came in without their click
                    share = c['weight'] / sum(x['weight'] for x in lst)
                    extra = int(rng.binomial(len(self.noncamp_orders_today), min(vt * share, 1.0)))
                    if extra:
                        orders = orders + list(rng.choice(self.noncamp_orders_today, size=extra))
                        conv += extra
                avg = (sum(orders) / n_orders) if n_orders else 150.0
                val = round(conv * avg * rng.uniform(0.95, 1.05), 2)
                if spend is None:
                    spend = val * 0.08
                row = dict(camp=c['k'], date=day, imp=imp, clicks=clicks, spend=round(spend, 2), conv=conv, val=val,
                           sent=st.get('sent') if st and ch in ('email', 'push_notification') else None,
                           delivered=st.get('delivered') if st and ch in ('email', 'push_notification') else None,
                           opened=st.get('opened') if st and ch in ('email', 'push_notification') else None,
                           unsub=st.get('unsub') if st and ch in ('email', 'push_notification') else None)
                self.R['campaign_daily'].append(row)


def _zipf(n):
    w = np.array([1 / (i + 1) for i in range(n)])
    return w / w.sum()


_HOUR_W = np.array([0.6, 0.35, 0.2, 0.15, 0.15, 0.3, 0.8, 1.6, 2.6, 3.4, 4.0, 4.3, 4.6, 4.5, 4.3, 4.3, 4.5,
                    5.0, 5.6, 6.3, 6.8, 6.4, 4.6, 2.0])
_HOUR_W = _HOUR_W / _HOUR_W.sum()
