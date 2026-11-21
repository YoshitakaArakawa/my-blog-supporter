"""Static masters of the SampleHyperStore world: geography, warehouses, carriers, suppliers,
products, campaigns, promotions, sales reps. All names are fictional."""
from __future__ import annotations

import datetime as dt
import numpy as np

D = dt.date

# ---------------------------------------------------------------- geography
# state: (population share weight in millions, approx. state sales tax rate, serving warehouse,
#         region until 2024-12-31)
STATES = {
    'AL': (5.1, .04, 'WH-E', 'R-SOUTH'), 'AK': (0.7, .0, 'WH-W', 'R-WEST'), 'AZ': (7.4, .056, 'WH-W', 'R-SOUTH'),
    'AR': (3.1, .065, 'WH-C', 'R-SOUTH'), 'CA': (39.0, .0725, 'WH-W', 'R-WEST'), 'CO': (5.9, .029, 'WH-W', 'R-WEST'),
    'CT': (3.6, .0635, 'WH-E', 'R-EAST'), 'DE': (1.0, .0, 'WH-E', 'R-EAST'), 'DC': (0.7, .06, 'WH-E', 'R-EAST'),
    'FL': (22.6, .06, 'WH-E', 'R-SOUTH'), 'GA': (11.0, .04, 'WH-E', 'R-SOUTH'), 'HI': (1.4, .04, 'WH-W', 'R-WEST'),
    'ID': (2.0, .06, 'WH-W', 'R-WEST'), 'IL': (12.5, .0625, 'WH-C', 'R-CENTRAL'), 'IN': (6.9, .07, 'WH-C', 'R-CENTRAL'),
    'IA': (3.2, .06, 'WH-C', 'R-CENTRAL'), 'KS': (2.9, .065, 'WH-C', 'R-CENTRAL'), 'KY': (4.5, .06, 'WH-E', 'R-SOUTH'),
    'LA': (4.6, .0445, 'WH-C', 'R-SOUTH'), 'ME': (1.4, .055, 'WH-E', 'R-EAST'), 'MD': (6.2, .06, 'WH-E', 'R-EAST'),
    'MA': (7.0, .0625, 'WH-E', 'R-EAST'), 'MI': (10.0, .06, 'WH-C', 'R-EAST'), 'MN': (5.7, .06875, 'WH-C', 'R-CENTRAL'),
    'MS': (2.9, .07, 'WH-E', 'R-SOUTH'), 'MO': (6.2, .04225, 'WH-C', 'R-CENTRAL'), 'MT': (1.1, .0, 'WH-W', 'R-WEST'),
    'NE': (2.0, .055, 'WH-C', 'R-CENTRAL'), 'NV': (3.2, .0685, 'WH-W', 'R-WEST'), 'NH': (1.4, .0, 'WH-E', 'R-EAST'),
    'NJ': (9.3, .06625, 'WH-E', 'R-EAST'), 'NM': (2.1, .05, 'WH-W', 'R-SOUTH'), 'NY': (19.6, .04, 'WH-E', 'R-EAST'),
    'NC': (10.8, .0475, 'WH-E', 'R-SOUTH'), 'ND': (0.8, .05, 'WH-C', 'R-CENTRAL'), 'OH': (11.8, .0575, 'WH-C', 'R-EAST'),
    'OK': (4.0, .045, 'WH-C', 'R-SOUTH'), 'OR': (4.2, .0, 'WH-W', 'R-WEST'), 'PA': (13.0, .06, 'WH-E', 'R-EAST'),
    'RI': (1.1, .07, 'WH-E', 'R-EAST'), 'SC': (5.4, .06, 'WH-E', 'R-SOUTH'), 'SD': (0.9, .042, 'WH-C', 'R-CENTRAL'),
    'TN': (7.1, .07, 'WH-E', 'R-SOUTH'), 'TX': (30.5, .0625, 'WH-C', 'R-SOUTH'), 'UT': (3.4, .061, 'WH-W', 'R-WEST'),
    'VT': (0.6, .06, 'WH-E', 'R-EAST'), 'VA': (8.7, .053, 'WH-E', 'R-EAST'), 'WA': (7.8, .065, 'WH-W', 'R-WEST'),
    'WV': (1.8, .06, 'WH-E', 'R-EAST'), 'WI': (5.9, .05, 'WH-C', 'R-CENTRAL'), 'WY': (0.6, .04, 'WH-W', 'R-WEST'),
}
STATE_CODES = list(STATES)
STATE_W = np.array([STATES[s][0] for s in STATE_CODES])
STATE_W = STATE_W / STATE_W.sum()
WEST_STATES = [s for s in STATE_CODES if STATES[s][2] == 'WH-W']


def region_of(state: str, day: D, e6_date: D, mountain: set[str]) -> str:
    if day >= e6_date and state in mountain:
        return 'R-MOUNTAIN'
    return STATES[state][3]


# zone distance warehouse -> state serving warehouse (1 = same, 2 = neighbour, 3 = far)
ZONE = {('WH-W', 'WH-W'): 1, ('WH-W', 'WH-C'): 2, ('WH-W', 'WH-E'): 3,
        ('WH-C', 'WH-C'): 1, ('WH-C', 'WH-W'): 2, ('WH-C', 'WH-E'): 2,
        ('WH-E', 'WH-E'): 1, ('WH-E', 'WH-C'): 2, ('WH-E', 'WH-W'): 3}

WAREHOUSES = [
    # id, name, city, state, tz, opened, sq ft
    ('WH-W', 'West Fulfillment Center', 'Silverpine', 'NV', 'America/Los_Angeles', D(2019, 3, 1), 220000),
    ('WH-C', 'Central Fulfillment Center', 'Prairie Hollow', 'KS', 'America/Chicago', D(2018, 6, 1), 310000),
    ('WH-E', 'East Fulfillment Center', 'Brookhaven Mills', 'PA', 'America/New_York', D(2017, 9, 1), 260000),
]
WH_IDS = ['WH-W', 'WH-C', 'WH-E']

CARRIERS = [
    ('CAR-01', 'Continental Parcel Service', 'national_parcel'),
    ('CAR-02', 'Meridian Ground Express', 'national_parcel'),
    ('CAR-03', 'Coastline Regional Delivery', 'regional_parcel'),
    ('CAR-04', 'Prairie Parcel Express', 'regional_parcel'),
    ('CAR-05', 'Basin Freight Lines', 'ltl_freight'),
    ('CAR-06', 'Keystone Freight Carriers', 'ltl_freight'),
]
# carrier profile: late probability, mean extra transit days, cost factor
CARRIER_PROFILE = {
    'CAR-01': (0.05, 0.0, 1.00), 'CAR-02': (0.055, 0.0, 1.02), 'CAR-03': (0.06, 0.2, 0.95),
    'CAR-04': (0.30, 1.0, 0.86), 'CAR-05': (0.10, 0.5, 1.0), 'CAR-06': (0.09, 0.5, 1.0),
}


def carrier_for(wh: str, service: str, day: D, e8_date: D) -> str:
    if service == 'ltl_freight':
        return 'CAR-05' if wh in ('WH-W', 'WH-C') else 'CAR-06'
    if service == 'two_day':
        return 'CAR-02'
    if wh == 'WH-W':
        return 'CAR-03'
    if wh == 'WH-C':
        return 'CAR-04' if day >= e8_date else 'CAR-01'
    return 'CAR-01' if day.toordinal() % 3 else 'CAR-02'  # East splits ground volume between two nationals


# ---------------------------------------------------------------- suppliers
SUPPLIERS = [
    # id, name, type, country, quoted lead, freight terms, payment, onboarded
    ('SUP-001', 'Northfork Outdoor Manufacturing', 'contract_manufacturer', 'VN', 55, 'fob_origin', 'net_60', D(2017, 4, 1)),
    ('SUP-002', 'Lanternbay Shelter Works', 'contract_manufacturer', 'VN', 50, 'fob_origin', 'net_60', D(2017, 8, 1)),
    ('SUP-003', 'Redcliff Textile Co.', 'contract_manufacturer', 'BD', 65, 'fob_origin', 'net_60', D(2018, 2, 1)),
    ('SUP-004', 'Haldane Apparel Industries', 'contract_manufacturer', 'CN', 60, 'fob_origin', 'net_60', D(2018, 5, 1)),
    ('SUP-005', 'Orchard Lane Metalcraft', 'contract_manufacturer', 'CN', 62, 'fob_origin', 'net_45', D(2018, 9, 1)),
    ('SUP-006', 'Tidewater Home Goods Factory', 'contract_manufacturer', 'IN', 58, 'fob_origin', 'net_60', D(2019, 1, 15)),
    ('SUP-007', 'Ridgecrest Gear Distributors', 'distributor', 'US', 10, 'delivered', 'net_30', D(2016, 5, 1)),
    ('SUP-008', 'Copperleaf Brands', 'brand_vendor', 'US', 12, 'delivered', 'net_30', D(2016, 11, 1)),
    ('SUP-009', 'Wildmere Footwear Group', 'brand_vendor', 'US', 14, 'delivered', 'net_45', D(2017, 3, 1)),
    ('SUP-010', 'Glenhaven Outdoor Supply', 'distributor', 'US', 9, 'delivered', 'net_30', D(2017, 6, 1)),
    ('SUP-011', 'Ashgrove Patio Living', 'brand_vendor', 'US', 18, 'fob_origin', 'net_45', D(2018, 1, 1)),
    ('SUP-012', 'Embercroft Heating Products', 'brand_vendor', 'US', 12, 'delivered', 'net_30', D(2018, 3, 1)),
    ('SUP-013', 'Fernway Garden Tools', 'brand_vendor', 'US', 8, 'delivered', 'net_30', D(2018, 7, 1)),
    ('SUP-014', 'Brightwater Comfort Co.', 'brand_vendor', 'MX', 21, 'fob_origin', 'net_45', D(2019, 4, 1)),
    ('SUP-015', 'Quarry Point Grill Works', 'brand_vendor', 'US', 15, 'delivered', 'net_30', D(2019, 8, 1)),
    ('SUP-016', 'Mossbank Trading', 'distributor', 'US', 7, 'delivered', 'net_30', D(2020, 2, 1)),
    ('SUP-017', 'Highplain Camp Supply', 'distributor', 'US', 9, 'delivered', 'net_30', D(2021, 6, 1)),
    ('SUP-018', 'Cedar Fork Wholesale', 'distributor', 'US', 6, 'delivered', 'net_30', D(2024, 7, 15)),
    ('SUP-019', 'Stillwater Apparel Partners', 'distributor', 'US', 10, 'delivered', 'net_45', D(2020, 3, 1)),
    ('SUP-020', 'Larkspur Home Distribution', 'distributor', 'US', 8, 'delivered', 'net_30', D(2021, 9, 1)),
]
SUP = {s[0]: s for s in SUPPLIERS}

# ---------------------------------------------------------------- product hierarchy
# subcategory: (category, n_skus, profile, price range, weight lb range, base share, private-label suppliers,
#               national suppliers, oversize share, hazmat share, sized)
SUBCATS = {
    'tents':                  ('camp_hike', 13, 'summer', (120, 480), (4, 22), .060, ['SUP-002'], ['SUP-007', 'SUP-017'], 0, 0, None),
    'sleeping_gear':          ('camp_hike', 14, 'summer', (40, 220), (1.5, 6), .060, ['SUP-001'], ['SUP-007', 'SUP-010'], 0, 0, None),
    'backpacks':              ('camp_hike', 12, 'spring_summer', (60, 260), (2, 6), .055, ['SUP-001'], ['SUP-010'], 0, 0, None),
    'camp_kitchen':           ('camp_hike', 16, 'summer', (12, 180), (0.8, 14), .075, ['SUP-005'], ['SUP-017', 'SUP-016'], 0, .25, None),
    'rain_shells':            ('outdoor_apparel', 16, 'shoulder', (90, 260), (0.8, 1.6), .060, ['SUP-003'], ['SUP-019'], 0, 0, 'apparel'),
    'insulated_jackets':      ('outdoor_apparel', 16, 'winter', (140, 380), (1.2, 2.6), .065, ['SUP-004'], ['SUP-019'], 0, 0, 'apparel'),
    'base_layers':            ('outdoor_apparel', 16, 'winter', (35, 90), (0.4, 0.9), .070, ['SUP-003'], ['SUP-019', 'SUP-016'], 0, 0, 'apparel'),
    'hiking_footwear':        ('outdoor_apparel', 16, 'shoulder', (110, 220), (2.2, 3.6), .060, [], ['SUP-009'], 0, 0, 'footwear'),
    'patio_furniture':        ('patio_garden', 11, 'spring_summer', (250, 1200), (35, 140), .045, ['SUP-005'], ['SUP-011'], .85, 0, None),
    'grills':                 ('patio_garden', 10, 'summer', (180, 900), (25, 160), .050, ['SUP-005'], ['SUP-015'], .5, .2, None),
    'garden_tools':           ('patio_garden', 13, 'spring', (15, 90), (1, 9), .065, ['SUP-006'], ['SUP-013'], 0, 0, None),
    'planters_irrigation':    ('patio_garden', 11, 'spring_summer', (20, 150), (2, 25), .050, ['SUP-006'], ['SUP-013', 'SUP-016'], 0, 0, None),
    'space_heaters':          ('home_comfort', 10, 'winter', (45, 220), (5, 18), .065, ['SUP-006'], ['SUP-012'], 0, 0, None),
    'fire_pits_patio_heaters': ('home_comfort', 9, 'fall', (150, 650), (30, 95), .045, ['SUP-005'], ['SUP-012', 'SUP-014'], .8, .45, None),
    'blankets_throws':        ('home_comfort', 10, 'holiday', (30, 120), (1.5, 5), .065, ['SUP-006'], ['SUP-020', 'SUP-014'], 0, 0, None),
    'indoor_air':             ('home_comfort', 9, 'winter', (60, 320), (5, 22), .055, ['SUP-006'], ['SUP-014', 'SUP-020'], 0, 0, None),
}
# marketplace skews toward small, giftable items (E2, Q54)
MARKETPLACE_SKEW = {'blankets_throws': 2.0, 'indoor_air': 1.6, 'camp_kitchen': 1.5, 'base_layers': 1.4,
                    'garden_tools': 1.3, 'patio_furniture': 0.3, 'grills': 0.4, 'fire_pits_patio_heaters': 0.4}
# B2B buyers (campgrounds, schools, corporate) buy camp gear and patio items in bulk
B2B_SKEW = {'tents': 2.5, 'sleeping_gear': 2.0, 'camp_kitchen': 2.0, 'backpacks': 1.4, 'patio_furniture': 1.6,
            'grills': 1.4, 'fire_pits_patio_heaters': 1.2, 'blankets_throws': 1.2, 'rain_shells': 0.8,
            'insulated_jackets': 0.6, 'base_layers': 0.5, 'hiking_footwear': 0.2, 'indoor_air': 0.4}

PRIVATE_BRANDS = {'camp_hike': 'Trailwright', 'outdoor_apparel': 'Northmere', 'patio_garden': 'Fernstead',
                  'home_comfort': 'Hearthline'}
NATIONAL_BRANDS = ['Brackenfield', 'Cindervale', 'Loftmark', 'Pinehollow', 'Stonereach', 'Driftlark', 'Emberwick',
                   'Quillmoss', 'Marrowdale', 'Thistlecove']
NAME_WORDS = {
    'tents': (['Ridgeline', 'Basecamp', 'Sundown', 'Cairn', 'Meadow', 'Alder', 'Granite'], ['2P Backpacking Tent', '4P Dome Tent', '6P Family Tent', '1P Ultralight Tent', '3P Trekking Tent']),
    'sleeping_gear': (['Drift', 'Ember', 'Hollow', 'Lark', 'Summit'], ['20F Sleeping Bag', '35F Sleeping Bag', 'Insulated Sleeping Pad', 'Self-Inflating Pad', 'Camp Pillow']),
    'backpacks': (['Switchback', 'Ridge', 'Talus', 'Juniper'], ['40L Pack', '55L Pack', '22L Daypack', '65L Expedition Pack']),
    'camp_kitchen': (['Kindle', 'Fireside', 'Trailhead', 'Copperpot'], ['Two-Burner Stove', 'Backpacking Stove', 'Fuel Canister 8oz', 'Cook Set', 'Cooler 45qt', 'Insulated Mug', 'Camp Table']),
    'rain_shells': (['Squall', 'Mistral', 'Downpour', 'Cascade'], ['Rain Jacket']),
    'insulated_jackets': (['Frostline', 'Hearth', 'Boreal', 'Glacier'], ['Down Jacket']),
    'base_layers': (['Thermal', 'Wick', 'Layer', 'Merino'], ['Base Layer Crew']),
    'hiking_footwear': (['Trailstep', 'Scree', 'Canyon', 'Moraine'], ['Hiking Boot']),
    'patio_furniture': (['Veranda', 'Lakeside', 'Courtyard', 'Terrace'], ['Dining Set', 'Lounge Chair', 'Sectional Sofa', 'Bistro Set', 'Daybed']),
    'grills': (['Smokehouse', 'Charwood', 'Flamecrest', 'Ironside'], ['Gas Grill 3-Burner', 'Charcoal Kettle Grill', 'Pellet Smoker', 'Portable Grill', 'Flat-Top Griddle']),
    'garden_tools': (['Furrow', 'Greenhand', 'Rootwell', 'Tiller'], ['Pruning Shears', 'Garden Hoe', 'Hand Trowel Set', 'Leaf Rake', 'Hedge Trimmer', 'Wheelbarrow']),
    'planters_irrigation': (['Rainbarrel', 'Terracotta', 'Dripline', 'Willow'], ['Raised Bed Planter', 'Drip Irrigation Kit', 'Hose Reel', 'Self-Watering Planter']),
    'space_heaters': (['Warmspring', 'Glow', 'Hearthside', 'Radiant'], ['Ceramic Heater', 'Oil-Filled Radiator', 'Infrared Heater']),
    'fire_pits_patio_heaters': (['Bonfire', 'Ember', 'Kindlewood', 'Starlight'], ['Steel Fire Pit', 'Propane Fire Table', 'Patio Heater Tower']),
    'blankets_throws': (['Cozy', 'Fireside', 'Woolen', 'Hearth'], ['Sherpa Throw', 'Knit Blanket', 'Weighted Blanket', 'Camp Blanket']),
    'indoor_air': (['Clearbreeze', 'Pureleaf', 'Humidaire', 'Stillair'], ['Air Purifier', 'Cool Mist Humidifier', 'Dehumidifier']),
}
COLORS = ['olive', 'navy', 'charcoal', 'rust', 'slate', 'sand', 'forest', 'black']
APPAREL_SIZES = ['S', 'M', 'L', 'XL']
APPAREL_SIZE_W = [0.22, 0.32, 0.30, 0.16]
FOOT_SIZES = ['8', '9', '10', '11']
FOOT_SIZE_W = [0.2, 0.3, 0.3, 0.2]

# search vocabulary: query -> subcategory (None = catalog gap, zero results)
SEARCH_QUERIES = {
    'tents': ['tent', '4 person tent', '2 person tent', 'backpacking tent', 'family tent', 'camping tent'],
    'sleeping_gear': ['sleeping bag', 'sleeping pad', 'camp pillow'],
    'backpacks': ['backpack', 'hiking backpack', 'daypack'],
    'camp_kitchen': ['camp stove', 'cooler', 'fuel canister', 'cook set'],
    'rain_shells': ['rain jacket', 'waterproof jacket'],
    'insulated_jackets': ['down jacket', 'winter jacket', 'puffer jacket'],
    'base_layers': ['base layer', 'thermal shirt', 'merino'],
    'hiking_footwear': ['hiking boots', 'trail shoes'],
    'patio_furniture': ['patio set', 'outdoor sofa', 'lounge chair'],
    'grills': ['grill', 'gas grill', 'smoker', 'charcoal grill'],
    'garden_tools': ['pruning shears', 'garden tools', 'rake', 'wheelbarrow'],
    'planters_irrigation': ['planter', 'raised bed', 'drip irrigation', 'hose reel'],
    'space_heaters': ['space heater', 'heater', 'radiator heater'],
    'fire_pits_patio_heaters': ['fire pit', 'patio heater'],
    'blankets_throws': ['blanket', 'throw blanket', 'weighted blanket'],
    'indoor_air': ['air purifier', 'humidifier', 'dehumidifier'],
}
GAP_QUERIES = ['kayak', 'fishing rod', 'bike rack', 'hammock stand', 'snowshoes', 'trekking poles', 'paddle board',
               'solar charger', 'pool float', 'snow blower']


def build_products(rng, spec):
    """Return list of product dicts. Prices/costs are the 2022-01-01 baseline."""
    prods = []
    pid = 10001
    style = 2001
    for sc, (cat, n, prof, (plo, phi), (wlo, whi), share, pl_sup, nb_sup, ovs, haz, sized) in SUBCATS.items():
        first, second = NAME_WORDS[sc]
        if sized:
            n_styles = n // 4
            variants = []
            for s in range(n_styles):
                variants.append([(s, k) for k in range(4)])
        else:
            variants = [[(s, None)] for s in range(n)]
        for s_i, vlist in enumerate(variants):
            is_private = rng.random() < ((spec['events']['E3']['private_label_share_tents'] if sc == 'tents' else 0.55) if pl_sup else 0.0)
            supplier = rng.choice(pl_sup) if is_private else rng.choice(nb_sup)
            brand = PRIVATE_BRANDS[cat] if is_private else NATIONAL_BRANDS[int(rng.integers(len(NATIONAL_BRANDS)))]
            base_price = float(np.exp(rng.uniform(np.log(plo), np.log(phi))))
            base_price = round(base_price) - 0.01 if base_price > 20 else round(base_price, 0) - 0.01
            cost_ratio = rng.uniform(0.38, 0.46) if is_private else rng.uniform(0.52, 0.60)
            weight = round(float(rng.uniform(wlo, whi)), 4)
            name = f"{first[s_i % len(first)]} {second[s_i % len(second)]}"
            oversize = bool(rng.random() < ovs) or (sc == 'patio_furniture' and base_price > 400) \
                or (sc == 'grills' and weight > 70)
            hazmat = bool(rng.random() < haz) or ('Fuel' in name) or ('Propane' in name)
            color = COLORS[int(rng.integers(len(COLORS)))] if sized or sc in ('backpacks', 'tents', 'blankets_throws') else None
            popularity = float(rng.lognormal(0, 0.55)) * (base_price ** spec['pricing']['popularity_price_exponent'])
            # lifecycle: ~10% launch inside 2023-2025, ~10% discontinued inside
            r = rng.random()
            if r < 0.10:
                launch = D(2023, 1, 1) + dt.timedelta(days=int(rng.integers(60, 900)))
            else:
                launch = D(2018, 1, 1) + dt.timedelta(days=int(rng.integers(0, 1400)))
            disc = None
            if rng.random() < 0.10 and launch < D(2024, 6, 1):
                disc = D(2023, 4, 1) + dt.timedelta(days=int(rng.integers(0, 900)))
                if disc <= launch + dt.timedelta(days=200):
                    disc = None
            case_pack = int(rng.choice([1, 2, 4, 6, 12])) if base_price < 60 else int(rng.choice([1, 1, 2, 4]))
            if oversize:
                case_pack = 1
            for (_, k) in vlist:
                if sized == 'apparel':
                    size, size_w = APPAREL_SIZES[k], APPAREL_SIZE_W[k]
                elif sized == 'footwear':
                    size, size_w = FOOT_SIZES[k], FOOT_SIZE_W[k]
                else:
                    size, size_w = None, 1.0
                pname = name + (f", {color.title()}" if color else '') + (f", Size {size}" if size else '')
                prods.append(dict(
                    product_id=f"P-{pid}", style_code=f"ST-{style}", product_name=pname, category=cat, subcategory=sc,
                    brand=brand, brand_type='private_label' if is_private else 'national_brand', color=color, size=size,
                    seasonality_profile=prof, weight_lb=weight, is_oversize=oversize, is_hazmat=hazmat,
                    case_pack_qty=case_pack, supplier_id=supplier, launch_date=launch, discontinue_date=disc,
                    base_price=base_price, cost_ratio=cost_ratio, popularity=popularity * size_w * 4 if sized else popularity,
                    sized=sized,
                ))
                pid += 1
            style += 1
    return prods


# ---------------------------------------------------------------- campaigns and promotions
def bf_date(year):
    return {2022: D(2022, 11, 25), 2023: D(2023, 11, 24), 2024: D(2024, 11, 29), 2025: D(2025, 11, 28)}[year]


def build_promotions(products, rng, e5=True):
    """Promotions valid 2022-2025. Product lists are filled for product-scoped ones."""
    promos = []
    by_sc = {}
    for p in products:
        by_sc.setdefault(p['subcategory'], []).append(p)

    def add(name, code, ptype, scope, start, end, *, pct=None, amt=None, minamt=None, elig='all', chan='web_app',
            stack=False, maxuse=None, funded='company', subcats=(), share=1.0, featured_share=0.3, fixed_cut=None):
        pr = dict(promotion_name=name, promotion_code=code, promotion_type=ptype, scope=scope, discount_percent=pct,
                  discount_amount=amt, min_order_amount=minamt, eligibility=elig, channel_scope=chan,
                  start_date=start, end_date=end, is_stackable=stack, max_uses_per_customer=maxuse, funded_by=funded,
                  products=[])
        if scope == 'product':
            for sc in subcats:
                for p in by_sc[sc]:
                    if rng.random() < share:
                        late_add = rng.random() < 0.12
                        added = start + dt.timedelta(days=int(rng.integers(3, 15))) if late_add else start
                        if added > end:
                            added = start
                        upp = round(p['base_price'] * (1 - fixed_cut), 0) - 0.01 if ptype == 'fixed_price' else None
                        pr['products'].append(dict(product_id=p['product_id'], unit_promo_price=upp,
                                                   is_featured=bool(rng.random() < featured_share), added_date=added))
        promos.append(pr)
        return pr

    for y in (2022, 2023, 2024, 2025):
        bf = bf_date(y)
        add(f"welcome-10-off-{y}", "WELCOME10", 'amount_off', 'order', D(y, 1, 1), D(y, 12, 31), amt=10.0, minamt=50.0,
            elig='new_customers', chan='all_channels' if y >= 2024 else 'web_app', stack=True, maxuse=1)
        add(f"gold-reward-20-{y}", f"GOLD{y % 100}", 'amount_off', 'order', D(y, 1, 1), D(y, 12, 31), amt=20.0,
            minamt=100.0, elig='loyalty_gold', maxuse=4)
        add(f"silver-plus-spring-{y}", f"SPRING{y % 100}", 'percent_off', 'order', D(y, 4, 10), D(y, 4, 30), pct=0.10,
            minamt=75.0, elig='loyalty_silver_plus', maxuse=1)
        add(f"subscriber-spring-{y}", f"INSIDER{y % 100}S", 'percent_off', 'order', D(y, 3, 15), D(y, 3, 31), pct=0.15,
            minamt=60.0, elig='email_subscribers', maxuse=1)
        add(f"subscriber-fall-{y}", f"INSIDER{y % 100}F", 'percent_off', 'order', D(y, 9, 15), D(y, 9, 30), pct=0.15,
            minamt=60.0, elig='email_subscribers', maxuse=1)
        add(f"winback-20-{y}", f"COMEBACK{y % 100}", 'percent_off', 'order', D(y, 6, 1), D(y, 6, 30), pct=0.20,
            minamt=50.0, elig='lapsed_customers', maxuse=1)
        add(f"app-only-spring-{y}", None, 'percent_off', 'order', D(y, 5, 1), D(y, 5, 14), pct=0.10, chan='app_only')
        add(f"app-only-fall-{y}", None, 'percent_off', 'order', D(y, 10, 1), D(y, 10, 14), pct=0.10, chan='app_only')
        add(f"spring-garden-{y}", None, 'percent_off', 'product', D(y, 3, 10), D(y, 4, 30), pct=0.15,
            subcats=('garden_tools', 'planters_irrigation'), share=0.5 if y == 2025 else 0.8)
        add(f"spring-patio-{y}", None, 'percent_off', 'product', D(y, 4, 5), D(y, 5, 25), pct=0.12,
            subcats=('patio_furniture',), share=0.5 if y == 2025 else 0.8, funded='supplier' if y % 2 else 'company')
        add(f"footwear-trail-{y}", None, 'amount_off', 'product', D(y, 3, 20), D(y, 4, 20), amt=20.0,
            subcats=('hiking_footwear',), share=1.0, funded='supplier')
        add(f"grill-season-{y}", None, 'fixed_price', 'product', D(y, 5, 15), D(y, 7, 6), subcats=('grills',),
            share=0.6, fixed_cut=0.15)
        add(f"summer-camping-{y}", None, 'percent_off', 'product', D(y, 6, 1), D(y, 8, 15), pct=0.15,
            subcats=('tents', 'sleeping_gear', 'camp_kitchen'), share=0.75, featured_share=0.45)
        add(f"backpack-bundle-{y}", None, 'buy_x_get_y', 'product', D(y, 7, 15), D(y, 8, 31),
            subcats=('backpacks', 'camp_kitchen'), share=0.5)
        add(f"rain-ready-{y}", None, 'percent_off', 'product', D(y, 9, 10), D(y, 10, 20), pct=0.15,
            subcats=('rain_shells',), share=1.0)
        add(f"warm-home-{y}", None, 'percent_off', 'product', D(y, 10, 10), D(y, 11, 15), pct=0.12,
            subcats=('space_heaters', 'indoor_air'), share=0.8)
        bf_end = bf + dt.timedelta(days=4)
        add(f"black-friday-{y}", None, 'percent_off', 'product', bf - dt.timedelta(days=3), bf_end, pct=0.20,
            chan='all_channels', subcats=tuple(SUBCATS), share=0.55, featured_share=0.2)
        add(f"holiday-blankets-{y}", None, 'buy_x_get_y', 'product', D(y, 12, 5), D(y, 12, 22),
            subcats=('blankets_throws',), share=1.0, funded='supplier')
        add(f"winter-clearance-{y}", None, 'percent_off', 'product', D(y, 1, 5), D(y, 1, 31), pct=0.30,
            subcats=('insulated_jackets', 'base_layers', 'space_heaters'), share=0.5)
        if y >= 2024:
            add(f"marketplace-deal-days-{y}", None, 'percent_off', 'product', D(y, 7, 8), D(y, 7, 12), pct=0.18,
                chan='all_channels', funded='marketplace', subcats=('blankets_throws', 'camp_kitchen', 'indoor_air'), share=0.5)
        if y == 2024 and e5:
            add("free-shipping-over-50-2024-11", None, 'free_shipping', 'order', D(2024, 11, 1), D(2024, 12, 2),
                minamt=50.0, stack=True)
    for i, p in enumerate(promos):
        p['promotion_id'] = None
    return promos


def build_campaigns(rng, e5=True):
    """Campaign calendar. Returns list of dicts (campaign_id assigned later in date order)."""
    C = []

    def add(name, mchan, platform, objective, audience, theme, start, end, cost_model, window, managed,
            weight=1.0, promo_name=None, send_weekdays=None, send_every=None):
        C.append(dict(campaign_name=name, marketing_channel=mchan, ad_platform=platform, objective=objective,
                      audience_type=audience, theme=theme, start_date=start, end_date=end, cost_model=cost_model,
                      attribution_window=window, managed_by=managed, weight=weight, promo_name=promo_name,
                      send_weekdays=send_weekdays, send_every=send_every))

    add('always-on-brand-search', 'paid_search', 'search_engine_a', 'conversion', 'prospecting', 'sitewide',
        D(2021, 1, 1), None, 'cpc', '7d_click', 'in_house', 1.0)
    add('always-on-generic-search', 'paid_search', 'search_engine_b', 'conversion', 'prospecting', 'sitewide',
        D(2021, 1, 1), None, 'cpc', '30d_click', 'agency', 0.8)
    add('always-on-social-prospecting', 'paid_social', 'social_network_a', 'traffic', 'prospecting', 'sitewide',
        D(2021, 6, 1), None, 'cpc', '7d_click_1d_view', 'agency', 1.0)
    add('always-on-social-retargeting', 'paid_social', 'social_network_b', 'conversion', 'retargeting', 'sitewide',
        D(2021, 6, 1), None, 'cpc', '7d_click_1d_view', 'agency', 0.6)
    add('always-on-display-retargeting', 'display', 'display_network_a', 'conversion', 'retargeting', 'sitewide',
        D(2021, 6, 1), None, 'cpm', '30d_click', 'agency', 1.0)
    add('always-on-affiliate', 'affiliate', 'affiliate_network_a', 'conversion', 'prospecting', 'sitewide',
        D(2020, 1, 1), None, 'commission', '30d_click', 'in_house', 1.0)
    add('marketplace-sponsored-listings', 'marketplace_ads', 'marketplace_ads_console', 'conversion', 'prospecting',
        'sitewide', D(2024, 4, 1), None, 'commission', '7d_click', 'in_house', 1.0)
    for y in (2022, 2023, 2024, 2025):
        bf = bf_date(y)
        for q in range(4):
            qs = D(y, 3 * q + 1, 1)
            qe = (D(y, 3 * q + 4, 1) if q < 3 else D(y + 1, 1, 1)) - dt.timedelta(days=1)
            add(f"newsletter-{y}-q{q + 1}-email", 'email', 'email_service', 'retention', 'all_subscribers',
                'sitewide', qs, qe, 'per_send', '30d_click_open', 'in_house', send_weekdays=(1,), send_every=7)
            add(f"winback-{y}-q{q + 1}-email", 'email', 'email_service', 'reactivation', 'lapsed_customers',
                'sitewide', qs, qe, 'per_send', '30d_click_open', 'in_house', send_weekdays=(3,), send_every=28)
        for h, (hs, he) in enumerate(((D(y, 1, 1), D(y, 6, 30)), (D(y, 7, 1), D(y, 12, 31)))):
            add(f"app-push-{y}-h{h + 1}", 'push_notification', 'app_push_service', 'retention', 'existing_customers',
                'sitewide', hs, he, 'per_send', '1d_click', 'in_house', send_weekdays=(5,), send_every=14)
        add(f"spring-garden-{y}-paid_social", 'paid_social', 'social_network_a', 'conversion', 'prospecting',
            'garden', D(y, 3, 8), D(y, 4, 30), 'cpc', '7d_click_1d_view', 'agency', 0.5, f"spring-garden-{y}")
        add(f"spring-garden-{y}-paid_search", 'paid_search', 'search_engine_a', 'conversion', 'prospecting', 'garden',
            D(y, 3, 8), D(y, 4, 30), 'cpc', '7d_click', 'in_house', 0.35)
        add(f"new-arrivals-{y}-display", 'display', 'display_network_a', 'awareness', 'prospecting', 'new_arrivals',
            D(y, 4, 1), D(y, 4, 30), 'cpm', '7d_click_1d_view', 'agency', 0.4)
        add(f"summer-camping-{y}-paid_social", 'paid_social', 'social_network_a', 'conversion', 'prospecting',
            'camping', D(y, 5, 20), D(y, 8, 15), 'cpc', '7d_click_1d_view', 'agency', 0.7, f"summer-camping-{y}")
        add(f"summer-camping-{y}-paid_search", 'paid_search', 'search_engine_b', 'conversion', 'prospecting',
            'camping', D(y, 5, 20), D(y, 8, 15), 'cpc', '30d_click', 'agency', 0.45)
        add(f"summer-camping-{y}-display", 'display', 'display_network_a', 'awareness', 'retargeting', 'camping',
            D(y, 6, 1), D(y, 8, 15), 'cpm', '30d_click', 'agency', 0.4)
        add(f"fall-apparel-{y}-paid_social", 'paid_social', 'social_network_b', 'conversion', 'prospecting',
            'apparel', D(y, 9, 10), D(y, 10, 31), 'cpc', '7d_click_1d_view', 'agency', 0.45, f"rain-ready-{y}")
        add(f"warm-home-{y}-paid_social", 'paid_social', 'social_network_a', 'conversion', 'prospecting', 'heating',
            D(y, 10, 8), D(y, 11, 15), 'cpc', '7d_click_1d_view', 'agency', 0.5, f"warm-home-{y}")
        add(f"warm-home-{y}-display", 'display', 'display_network_a', 'awareness', 'retargeting', 'heating',
            D(y, 10, 8), D(y, 12, 15), 'cpm', '30d_click', 'agency', 0.35)
        bs, be = bf - dt.timedelta(days=7), bf + dt.timedelta(days=4)
        add(f"black-friday-{y}-paid_social", 'paid_social', 'social_network_a', 'conversion', 'retargeting',
            'black_friday', bs, be, 'cpc', '7d_click_1d_view', 'agency', 1.6, f"black-friday-{y}")
        add(f"black-friday-{y}-paid_search", 'paid_search', 'search_engine_a', 'conversion', 'prospecting',
            'black_friday', bs, be, 'cpc', '7d_click', 'in_house', 1.2, f"black-friday-{y}")
        add(f"black-friday-{y}-display", 'display', 'display_network_a', 'conversion', 'retargeting', 'black_friday',
            bs, be, 'cpm', '30d_click', 'agency', 1.0, f"black-friday-{y}")
        add(f"black-friday-{y}-email", 'email', 'email_service', 'conversion', 'all_subscribers', 'black_friday',
            bf - dt.timedelta(days=1), bf + dt.timedelta(days=3), 'per_send', '30d_click_open', 'in_house',
            promo_name=f"black-friday-{y}", send_weekdays=(0, 1, 2, 3, 4, 5, 6), send_every=1)
        add(f"black-friday-{y}-push", 'push_notification', 'app_push_service', 'conversion', 'existing_customers',
            'black_friday', bf, bf + dt.timedelta(days=3), 'per_send', '1d_click', 'in_house',
            promo_name=f"black-friday-{y}", send_weekdays=(0, 1, 2, 3, 4, 5, 6), send_every=3)
        add(f"winter-clearance-{y}-email", 'email', 'email_service', 'conversion', 'all_subscribers', 'clearance',
            D(y, 1, 6), D(y, 1, 27), 'per_send', '30d_click_open', 'in_house', promo_name=f"winter-clearance-{y}",
            send_weekdays=(5,), send_every=7)
        if y == 2024 and e5:
            add("free-shipping-2024-11-paid_social", 'paid_social', 'social_network_a', 'conversion', 'prospecting',
                'sitewide', D(2024, 11, 1), D(2024, 12, 2), 'cpc', '7d_click_1d_view', 'agency', 0.8,
                "free-shipping-over-50-2024-11")
            add("free-shipping-2024-11-display", 'display', 'display_network_a', 'conversion', 'retargeting',
                'sitewide', D(2024, 11, 1), D(2024, 12, 2), 'cpm', '30d_click', 'agency', 0.6,
                "free-shipping-over-50-2024-11")
            add("free-shipping-2024-11-email", 'email', 'email_service', 'conversion', 'all_subscribers', 'sitewide',
                D(2024, 11, 1), D(2024, 11, 29), 'per_send', '30d_click_open', 'in_house',
                promo_name="free-shipping-over-50-2024-11", send_weekdays=(4,), send_every=7)
    return C


THEME_SUBCATS = {
    'camping': ['tents', 'sleeping_gear', 'camp_kitchen', 'backpacks'],
    'garden': ['garden_tools', 'planters_irrigation', 'patio_furniture'],
    'heating': ['space_heaters', 'indoor_air', 'fire_pits_patio_heaters', 'blankets_throws'],
    'apparel': ['rain_shells', 'insulated_jackets', 'base_layers', 'hiking_footwear'],
}
