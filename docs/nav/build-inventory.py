#!/usr/bin/env python3
"""
build-inventory.py — Extract routes and navigation data from 6 BSuite apps
and produce a deterministic JSON file at docs/nav/route-inventory.json.

Usage:
    python3 docs/nav/build-inventory.py

Output:
    docs/nav/route-inventory.json
"""

import json
import os
import re
import sys

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "route-inventory.json")

# Paths (relative to REPO_ROOT) that must receive a byte-identical copy of the
# inventory because an app bundles it at build time and cannot reach outside its
# own submodule. See the write block in main() for why this exists.
VENDORED_COPIES = [
    "business-suite-unified/src/data/route-inventory.json",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def read_file(rel_path):
    """Read a file relative to REPO_ROOT, return text or empty string."""
    full = os.path.join(REPO_ROOT, rel_path)
    try:
        with open(full, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""


def line_number_of(text, char_offset):
    """Return 1-based line number for a character offset in text."""
    return text[:char_offset].count("\n") + 1


# ---------------------------------------------------------------------------
# component -> file resolution
#
# A component NAME on its own is not actionable. "Unknown" and "AcceptInvite"
# are equally hard to open: one says nothing, the other says a symbol without
# saying where it lives, and in an estate with six apps and repeated page names
# that is a search, not a citation. `component_file` closes it.
#
# It is deliberately NULLABLE and deliberately NOT guessed. A route whose file
# cannot be resolved records null — never a plausible-looking path. "Checked and
# found nothing" and "could not check" must not share an output (D-92); the
# resolver only ever returns a path it has confirmed exists on disk.
# ---------------------------------------------------------------------------

# Components that name a ROUTING MECHANISM rather than a page. There is no file
# to point at for these, and inventing one would be the exact failure this field
# exists to fix.
#
# "Index" IS NOT IN THIS SET, and the first draft of it wrongly was. React
# Router's index ROUTES are matched by the `index` attribute, never by a
# component of that name — and braden's home page is a real component literally
# called `Index`, imported from braden/src/pages/Index.tsx. Listing it here
# blanked a genuine page's file and the output still looked clean, because a
# route in the structural set is EXPECTED to resolve to null. A detector only
# sees the mechanisms its author happened to know; assert_structural_are_structural()
# below is what turns that guess into something checked.
STRUCTURAL_COMPONENTS = {
    "Unknown", "Outlet", "Navigate", "Redirect", "RedirectTo",
}

_IMPORT_MAP_CACHE = {}


def _resolve_module_path(route_file, spec):
    """
    Resolve an import specifier as written in `route_file` to a repo-relative
    path, or None. Only returns paths that EXIST — a bare package specifier
    ('react', '@tanstack/react-query') resolves to None, as does a file that
    moved out from under a stale import.
    """
    if spec.startswith("@/"):
        # Every app in this estate aliases '@' to its own src/. Anchor on the
        # ROUTE FILE's app rather than a lookup table, so a new app needs no
        # entry here and a wrong entry cannot silently point across a submodule
        # boundary.
        app_dir = route_file.split("/")[0]
        base = os.path.join(app_dir, "src", spec[2:])
    elif spec.startswith("."):
        base = os.path.normpath(os.path.join(os.path.dirname(route_file), spec))
    else:
        return None

    if base.startswith(".."):
        return None  # escaped the repo — not ours to cite

    candidates = [base]
    # A specifier may already carry its extension (R80.4 imports
    # '../charge-calculator-v9-2.tsx' with it).
    if not re.search(r'\.(tsx|ts|jsx|js)$', base):
        candidates += [base + ext for ext in (".tsx", ".ts", ".jsx", ".js")]
        candidates += [os.path.join(base, "index" + ext)
                       for ext in (".tsx", ".ts", ".jsx", ".js")]

    for cand in candidates:
        if os.path.isfile(os.path.join(REPO_ROOT, cand)):
            return cand.replace(os.sep, "/")
    return None


def build_import_map(route_file):
    """
    component name -> repo-relative file, for one route file.

    Handles the three forms this estate actually uses, INCLUDING the two that a
    line-oriented regex misses:

      const X = lazy(() => import('./pages/x'))                 single line
      const X = lazy(() =>                                      wrapped, and
        retryImport(() => import('./pages/x')),                 behind a helper
      )
      import X from './pages/x'                                 default
      import { X, Y as Z } from './pages/x'                     named

    crm7 alone wraps 300+ of its imports in `retryImport`, so a pattern that
    only understands `lazy(() => import(...))` resolves almost nothing there.
    Rather than enumerate wrapper helpers, this takes the FIRST `import('...')`
    inside the lazy() call whatever surrounds it.
    """
    if route_file in _IMPORT_MAP_CACHE:
        return _IMPORT_MAP_CACHE[route_file]

    text = read_file(route_file)
    mapping = {}

    # lazy(...) — scan to the matching close paren so a wrapped/multi-line body
    # is read in full instead of being cut at the first newline.
    for m in re.finditer(r'\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(?:React\.)?lazy\(', text):
        name = m.group(1)
        i = m.end() - 1
        depth = 0
        end = len(text)
        while i < len(text):
            if text[i] == "(":
                depth += 1
            elif text[i] == ")":
                depth -= 1
                if depth == 0:
                    end = i
                    break
            i += 1
        body = text[m.end():end]
        im = re.search(r'''import\(\s*['"]([^'"]+)['"]''', body)
        if im:
            resolved = _resolve_module_path(route_file, im.group(1))
            if resolved:
                mapping[name] = resolved

    # default imports
    for m in re.finditer(
        r'''^\s*import\s+([A-Za-z_$][\w$]*)\s*(?:,\s*\{[^}]*\})?\s+from\s+['"]([^'"]+)['"]''',
        text, re.M,
    ):
        resolved = _resolve_module_path(route_file, m.group(2))
        if resolved:
            mapping.setdefault(m.group(1), resolved)

    # named imports (including `as` aliases — the LOCAL name is what the JSX uses)
    for m in re.finditer(
        r'''^\s*import\s+\{([^}]*)\}\s+from\s+['"]([^'"]+)['"]''',
        text, re.M | re.S,
    ):
        resolved = _resolve_module_path(route_file, m.group(2))
        if not resolved:
            continue
        for part in m.group(1).split(","):
            part = part.strip()
            if not part:
                continue
            local = part.split(" as ")[-1].strip()
            if re.fullmatch(r'[A-Za-z_$][\w$]*', local):
                mapping.setdefault(local, resolved)

    _IMPORT_MAP_CACHE[route_file] = mapping
    return mapping


def resolve_component_file(route_file, component):
    """
    Repo-relative file for `component` as referenced from `route_file`, or None.
    None is a real answer here, not a failure to try — see STRUCTURAL_COMPONENTS.
    """
    if not component or component in STRUCTURAL_COMPONENTS:
        return None

    # conduit is Next.js app-router: the route file IS the page/handler, and the
    # synthetic component names ("Page", "ApiRoute") never appear as imports.
    if component in ("Page", "ApiRoute"):
        return route_file if os.path.isfile(os.path.join(REPO_ROOT, route_file)) else None

    hit = build_import_map(route_file).get(component)
    if hit:
        return hit

    # Declared in the route file itself (crm7's RedirectTo, R80.4's AuthGate).
    text = read_file(route_file)
    if re.search(r'\b(?:function|const|class)\s+' + re.escape(component) + r'\b', text):
        return route_file

    return None


def assert_structural_are_structural(routes):
    """
    Fail loudly if a name in STRUCTURAL_COMPONENTS turns out to be a real,
    imported page component in some app.

    Membership of that set is an ASSUMPTION about what a name means, and a wrong
    assumption there is invisible in the output: the field is supposed to be null
    for a structural route, so a misclassified page reads as correctly handled.
    That is precisely how `Index` — braden's actual home page — was silently
    blanked. This turns the assumption into a measurement.
    """
    wrong = []
    for r in routes:
        if r["component"] not in STRUCTURAL_COMPONENTS:
            continue
        hit = build_import_map(r["route_file"]).get(r["component"])
        if hit:
            wrong.append(f"{r['app']} {r['path']}: '{r['component']}' is imported from {hit}")
    if wrong:
        raise SystemExit(
            "STRUCTURAL_COMPONENTS misclassification — these names are real "
            "imported components, so blanking their component_file hides a page:\n  "
            + "\n  ".join(sorted(set(wrong)))
            + "\nRemove the name from STRUCTURAL_COMPONENTS in docs/nav/build-inventory.py."
        )


def annotate_component_files(routes):
    """Attach `component_file` to every route, and say so when it is structural."""
    for r in routes:
        r["component_file"] = resolve_component_file(r["route_file"], r["component"])

        # An `Outlet` route is a layout-only parent: it renders whichever child
        # matched, so there is no page behind it and naming one would be a lie.
        # Say that in the record instead of leaving a bare component name that
        # reads like a missing page.
        if r["component"] == "Outlet" and not r.get("note"):
            child = next(
                (c["component"] for c in routes
                 if c["app"] == r["app"]
                 and c["path"] == r["path"].rstrip("/") + "/"
                 and c["component"] not in STRUCTURAL_COMPONENTS),
                None,
            )
            r["note"] = (
                "structural: layout-only parent, renders <Outlet /> for its children"
                + (f"; its index child is {child}" if child else "")
            )


def make_route(*, app, path, route_file, component, layout, auth_type,
               permissions=None, feature_flags=None,
               nav_surface="none", nav_group=None, nav_label=None,
               nav_icon=None, nav_order=None,
               status="live", evidence=None, note=None):
    """Build a route dict in the canonical field order."""
    return {
        "app": app,
        "path": path,
        "route_file": route_file,
        "component": component,
        # Repo-relative file the component resolves to, or null. Populated by
        # annotate_component_files() once every route is built — null means
        # either "structural, there is no page" or "could not be resolved", and
        # the two are told apart by `component` and `note`, never guessed.
        "component_file": None,
        "layout": layout,
        "auth": {
            "type": auth_type,
            "permissions": permissions or [],
            "feature_flags": feature_flags or [],
        },
        "nav": {
            "surface": nav_surface,
            "group": nav_group,
            "label": nav_label,
            "icon": nav_icon,
            "order": nav_order,
        },
        # (bsuite#2012) `nav.surface` answers "is this in the app's nav CONFIG?".
        # It does NOT answer "can a user get here?". A page reached through an
        # in-page tab bar or a parent-section card grid is surface:"none" and was
        # therefore counted as an orphan — which is how wiring 45 crm7 pages into
        # sub-navigation (crm7#1732, verified live 3/5 -> 5/5) moved the orphan
        # count by exactly zero. Populated by annotate_reachability() below.
        "reachable_via": "unknown",
        "portal": None,
        "owned_entities": [],
        "data_tables": [],
        "status": status,
        "evidence": evidence,
        "note": note,
    }


# ---------------------------------------------------------------------------
# Nav map builders  (path → nav dict)
# ---------------------------------------------------------------------------

def build_crm7_nav_map():
    """
    Parse crm7/src/config/navigation.ts and return path → nav_entry.
    The file uses a SharedNavSection[] structure with groups[][].
    """
    text = read_file("crm7/src/config/navigation.ts")
    nav_map = {}

    # Extract each section block: label, href (optional), icon, groups
    # We scan for label: '...' blocks and collect hrefs within them.
    # Strategy: extract all href occurrences with their surrounding label context.

    # First pass: find section-level hrefs (sections with direct href)
    section_pattern = re.compile(
        r'\{\s*label:\s*[\'"]([^\'"]+)[\'"]\s*,\s*'
        r'icon:\s*(\w+)\s*,\s*'
        r'(?:href:\s*[\'"]([^\'"]+)[\'"]\s*,)?',
        re.DOTALL
    )

    # Build a flat list of all {label, href, icon} items across all groups
    # by scanning for { label: '...', href: '...' } pairs.
    item_pattern = re.compile(
        r'\{\s*label:\s*[\'"]([^\'"]+)[\'"]\s*,\s*'
        r'href:\s*[\'"]([^\'"]+)[\'"]\s*(?:,\s*(?:permission|icon|featureFlag)[^}]*)?\}',
        re.DOTALL
    )

    # We also need to know which section each item belongs to so we can set
    # the group label. Build a positional map: for each item match, find the
    # enclosing section by scanning backwards for the nearest section label.

    # Parse sections sequentially
    sections_raw = []
    # Find section blocks (objects in SHARED_SECTIONS or sections:[])
    # Look for label + icon pairs that start a section
    sec_start_pat = re.compile(
        r'\{\s*\n?\s*label:\s*[\'"]([^\'"]+)[\'"]\s*,\s*\n?\s*icon:\s*(\w+)',
        re.DOTALL
    )
    sec_starts = [(m.start(), m.group(1), m.group(2)) for m in sec_start_pat.finditer(text)]

    # For each section, find all items within it
    for i, (sec_start, sec_label, sec_icon) in enumerate(sec_starts):
        sec_end = sec_starts[i + 1][0] if i + 1 < len(sec_starts) else len(text)
        section_text = text[sec_start:sec_end]

        items = item_pattern.finditer(section_text)
        for item_match in items:
            item_label = item_match.group(1)
            item_href = item_match.group(2)
            if item_href and item_href.startswith("/"):
                nav_map[item_href] = {
                    "surface": "sidebar",
                    "group": sec_label,
                    "label": item_label,
                    "icon": sec_icon,
                    "order": len(nav_map),
                }

    # Also add section-level hrefs (sections that are themselves clickable)
    for sec_start, sec_label, sec_icon in sec_starts:
        sec_end_idx = text.find("\n  },", sec_start)
        if sec_end_idx == -1:
            sec_end_idx = sec_start + 2000
        section_block = text[sec_start:sec_end_idx]
        # Look for href: directly on the section object (before first group)
        direct_href_m = re.search(r'href:\s*[\'"]([^\'"]+)[\'"]', section_block[:300])
        if direct_href_m:
            h = direct_href_m.group(1)
            if h not in nav_map:
                nav_map[h] = {
                    "surface": "sidebar",
                    "group": sec_label,
                    "label": sec_label,
                    "icon": sec_icon,
                    "order": len(nav_map),
                }

    return nav_map


def build_bsu_nav_map():
    """Parse business-suite-unified/src/config/navigation.ts."""
    text = read_file("business-suite-unified/src/config/navigation.ts")
    nav_map = {}

    item_pattern = re.compile(
        r'\{\s*label:\s*[\'"]([^\'"]+)[\'"]\s*,\s*href:\s*[\'"]([^\'"]+)[\'"]\s*(?:,\s*icon:\s*(\w+))?[^}]*\}',
        re.DOTALL
    )
    sec_start_pat = re.compile(
        r'\{\s*\n?\s*label:\s*[\'"]([^\'"]+)[\'"]\s*,\s*\n?\s*icon:\s*(\w+)',
        re.DOTALL
    )
    sec_starts = [(m.start(), m.group(1), m.group(2)) for m in sec_start_pat.finditer(text)]

    for i, (sec_start, sec_label, sec_icon) in enumerate(sec_starts):
        sec_end = sec_starts[i + 1][0] if i + 1 < len(sec_starts) else len(text)
        section_text = text[sec_start:sec_end]
        for m in item_pattern.finditer(section_text):
            item_label, item_href = m.group(1), m.group(2)
            if item_href and item_href.startswith("/"):
                nav_map[item_href] = {
                    "surface": "sidebar",
                    "group": sec_label,
                    "label": item_label,
                    "icon": m.group(3) or sec_icon,
                    "order": len(nav_map),
                }

    return nav_map


def build_conduit_nav_map():
    """Parse conduit/src/config/navigation.ts."""
    text = read_file("conduit/src/config/navigation.ts")
    nav_map = {}

    item_pattern = re.compile(
        r'\{\s*label:\s*[\'"]([^\'"]+)[\'"]\s*,\s*href:\s*[\'"]([^\'"]+)[\'"]\s*(?:,\s*icon:\s*(\w+))?[^}]*\}',
        re.DOTALL
    )
    sec_start_pat = re.compile(
        r'\{\s*\n?\s*label:\s*[\'"]([^\'"]+)[\'"]\s*,\s*\n?\s*icon:\s*(\w+)',
        re.DOTALL
    )
    sec_starts = [(m.start(), m.group(1), m.group(2)) for m in sec_start_pat.finditer(text)]

    for i, (sec_start, sec_label, sec_icon) in enumerate(sec_starts):
        sec_end = sec_starts[i + 1][0] if i + 1 < len(sec_starts) else len(text)
        section_text = text[sec_start:sec_end]
        for m in item_pattern.finditer(section_text):
            item_label, item_href = m.group(1), m.group(2)
            if item_href and item_href.startswith("/"):
                nav_map[item_href] = {
                    "surface": "sidebar",
                    "group": sec_label,
                    "label": item_label,
                    "icon": m.group(3) or sec_icon,
                    "order": len(nav_map),
                }

    return nav_map


def build_r80_nav_map():
    """R80.4 has exactly one nav entry: Charge Rate Calculator at /."""
    return {
        "/": {
            "surface": "sidebar",
            "group": "Calculate",
            "label": "Charge Rate Calculator",
            "icon": "Calculator",
            "order": 0,
        }
    }


def build_braden_nav_map():
    """
    braden/src/config/navigation.ts uses NavigationItem[] with action/target.
    Map navigate targets (paths) only — scroll targets map to /#fragment which
    don't correspond to routes.
    """
    text = read_file("braden/src/config/navigation.ts")
    nav_map = {}

    item_pattern = re.compile(
        r'\{\s*label:\s*[\'"]([^\'"]+)[\'"]\s*,\s*'
        r'action:\s*[\'"](\w+)[\'"]\s*,\s*'
        r'target:\s*[\'"]([^\'"]+)[\'"]\s*\}',
        re.DOTALL
    )
    order = 0
    for m in item_pattern.finditer(text):
        label, action, target = m.group(1), m.group(2), m.group(3)
        if action == "navigate":
            nav_map[target] = {
                "surface": "topnav",
                "group": "Main",
                "label": label,
                "icon": None,
                "order": order,
            }
            order += 1
        elif action == "scroll":
            # scroll targets are hash anchors on home, not routes
            pass

    return nav_map


def build_throughput_nav_map():
    """
    throughput nav items are defined inline in Navigation.tsx navItems array.
    Items: Dashboard (/), Launch Pad (/launch), Analytics (/analytics),
           Teams (/teams), Pricing (/pricing).
    """
    items = [
        ("/", "Dashboard", "LayoutDashboard"),
        ("/launch", "Launch Pad", "Rocket"),
        ("/analytics", "Analytics", "BarChart3"),
        ("/teams", "Teams", "User"),
        ("/pricing", "Pricing", "CreditCard"),
    ]
    nav_map = {}
    for order, (path, label, icon) in enumerate(items):
        nav_map[path] = {
            "surface": "topnav",
            "group": "Main",
            "label": label,
            "icon": icon,
            "order": order,
        }
    return nav_map


# ---------------------------------------------------------------------------
# Route extractors
# ---------------------------------------------------------------------------

def find_jsx_tags(text, tag_name):
    """
    Find all <tag_name ...> or <tag_name ... /> JSX tags, correctly handling
    nested braces in attribute values like element={<Foo />}.
    Returns list of (start, attrs_text, is_self_closing) tuples.
    """
    results = []
    i = 0
    opener = "<" + tag_name
    while i < len(text):
        idx = text.find(opener, i)
        if idx == -1:
            break
        # Verify it's actually a tag (not e.g. <Routes)
        after = idx + len(opener)
        if after < len(text) and text[after] not in (" ", "\t", "\n", "\r", ">", "/"):
            i = after
            continue
        # Scan forward, tracking brace depth to skip JSX inside {}
        j = after
        brace_depth = 0
        while j < len(text):
            ch = text[j]
            if ch == "{":
                brace_depth += 1
            elif ch == "}":
                brace_depth -= 1
            elif brace_depth == 0:
                if ch == ">" and j > 0 and text[j - 1] == "/":
                    # Self-closing: <Route ... />
                    attrs = text[after:j - 1]
                    results.append((idx, attrs, True))
                    break
                elif ch == ">":
                    # Opening tag: <Route ...>
                    attrs = text[after:j]
                    results.append((idx, attrs, False))
                    break
            j += 1
        i = j + 1 if j < len(text) else len(text)
    return results


def extract_component_name(component_str):
    """
    Extract component name from various JSX/component prop forms:
      - component={ComponentName}
      - component={() => <S component={ComponentName} />}
      - element={<ComponentName />}
      - element={<Wrapper><ComponentName /></Wrapper>}
    Returns the innermost/last uppercase component name found.
    """
    # Try component={() => <S component={Foo} />}
    m = re.search(r'component=\{[^}]*<S\s+component=\{(\w+)\}', component_str)
    if m:
        return m.group(1)

    # Try component={ComponentName} (bare identifier, not arrow fn)
    m = re.search(r'component=\{(\w+)\}', component_str)
    if m and not m.group(1).startswith("(") and m.group(1)[0].isupper():
        return m.group(1)

    # Try element={<ComponentName ...>} — get innermost uppercase tag
    tags = re.findall(r'<([A-Z]\w+)', component_str)
    if tags:
        # Skip common wrappers
        wrappers = {"Navigate", "Suspense", "PageGridRoute", "RequireOrganization",
                    "TenantThemeProvider", "S", "AuthenticatedLoginRedirect"}
        for tag in reversed(tags):
            if tag not in wrappers:
                return tag
        return tags[-1]

    return "Unknown"


def extract_crm7_routes(nav_map):
    """
    Parse crm7/src/App.tsx for ProtectedRoute and plain Route declarations.
    PublicRoutes section (~line 1253) and AppRoutes section (~line 1295).
    """
    route_file = "crm7/src/App.tsx"
    text = read_file(route_file)
    routes = []

    # ---- Public routes (PublicRoutes component) ----
    pub_start = text.find("const PublicRoutes = React.memo")
    pub_end = text.find("const AppRoutes = React.memo")
    if pub_start == -1:
        pub_start = 0
    if pub_end == -1:
        pub_end = len(text)
    public_text = text[pub_start:pub_end]

    # USE THE BRACE-AWARE TAG FINDER, NOT A `[^>]*?>` REGEX.
    #
    # Every one of crm7's twelve public routes reported component "Unknown"
    # until 2026-08-25, and all twelve failed for the same reason. The old
    # pattern was:
    #
    #     r'<Route\s[^>]*?path=["\']([^"\']+)["\'][^>]*?>'
    #
    # `[^>]` cannot cross a `>`, and every public route here is written as
    #
    #     <Route path="/" component={() => <S component={MarketingHome} />} />
    #
    # whose value contains `=>`. The match therefore ended at the `>` of the
    # ARROW, capturing `<Route path="/" component={() =>` — a fragment with no
    # closing brace, so the follow-up `component=\{(.+?)\}` found nothing and
    # extract_component_name() fell through to its "Unknown" return.
    #
    # A parser blind to a syntax form reports ABSENCE, not a gap: the inventory
    # did not say "twelve routes I could not parse", it said "twelve routes with
    # component Unknown", which reads like a finding about the app rather than
    # about the parser. Nine of the twelve are unauthenticated or token-
    # authenticated entry points — the routes a route inventory most needs to
    # have looked at.
    #
    # The multi-line second pass that used to follow was dead code for the same
    # reason: it skipped any path the broken first pass had already appended,
    # and the broken first pass matched every route.
    #
    # find_jsx_tags() tracks brace depth, so `>` inside `{...}` cannot end the
    # tag. It is the same helper the BSU extractor already used.
    for (tag_start, attrs, _is_self_closing) in find_jsx_tags(public_text, "Route"):
        path_match = re.search(r'path=["\']([^"\']+)["\']', attrs)
        if not path_match:
            continue
        route_path = path_match.group(1)

        comp_match = re.search(r'component=\{(.+)\}', attrs, re.DOTALL)
        component = extract_component_name(
            "component={" + (comp_match.group(1) if comp_match else "") + "}"
        )

        is_redirect = "RedirectTo" in attrs or "Redirect" in component
        to_match = re.search(r'to=["\']([^"\']+)["\']', attrs)

        line = line_number_of(text, pub_start + tag_start)

        nav_entry = nav_map.get(route_path, {})
        routes.append(make_route(
            app="crm7",
            path=route_path,
            route_file=route_file,
            component=component if component else "Unknown",
            layout="none",
            auth_type="public",
            permissions=[],
            feature_flags=[],
            nav_surface=nav_entry.get("surface", "none"),
            nav_group=nav_entry.get("group"),
            nav_label=nav_entry.get("label"),
            nav_icon=nav_entry.get("icon"),
            nav_order=nav_entry.get("order"),
            status="redirect" if is_redirect else "live",
            evidence=f"{route_file}:{line}",
            note=f"→ {to_match.group(1)}" if (is_redirect and to_match) else None,
        ))

    # ---- Protected routes (AppRoutes component) ----
    app_start = text.find("const AppRoutes = React.memo")
    if app_start == -1:
        app_start = 0
    app_text = text[app_start:]

    # Match ProtectedRoute blocks (may span multiple lines)
    protected_pat = re.compile(
        r'<ProtectedRoute\s(.*?)/>',
        re.DOTALL
    )

    for m in protected_pat.finditer(app_text):
        block = m.group(0)
        path_match = re.search(r'path=["\']([^"\']+)["\']', block)
        if not path_match:
            continue
        route_path = path_match.group(1)

        comp_match = re.search(r'component=\{(.+?)\}(?:\s*\n\s*\w|\s*\n\s*/>|\s*permission|\s*route)', block, re.DOTALL)
        if not comp_match:
            comp_match = re.search(r'component=\{(.+?)\}', block, re.DOTALL)
        component = extract_component_name("component={" + (comp_match.group(1) if comp_match else "") + "}")

        perm_match = re.search(r'permission(?:s)?=\{["\']?([^\'"}\]]+)["\']?\}', block)
        # permissions might be an array: permissions={['a','b']}
        perms_arr_match = re.search(r'permissions=\{\[(.+?)\]\}', block, re.DOTALL)
        permissions = []
        if perms_arr_match:
            permissions = [p.strip().strip("'\"") for p in perms_arr_match.group(1).split(",")]
        elif perm_match:
            permissions = [perm_match.group(1).strip()]

        route_name_match = re.search(r'routeName=["\']([^"\']+)["\']', block)

        line = line_number_of(text, app_start + m.start())

        # Feature flags — from withFeatureGate wrapper (not common in this file but handle)
        ff_match = re.search(r'withFeatureGate\(["\']([^"\']+)["\']', block)
        feature_flags = [ff_match.group(1)] if ff_match else []

        nav_entry = nav_map.get(route_path, {})
        routes.append(make_route(
            app="crm7",
            path=route_path,
            route_file=route_file,
            component=component,
            layout="MainLayout",
            auth_type="authenticated",
            permissions=permissions,
            feature_flags=feature_flags,
            nav_surface=nav_entry.get("surface", "none"),
            nav_group=nav_entry.get("group"),
            nav_label=nav_entry.get("label"),
            nav_icon=nav_entry.get("icon"),
            nav_order=nav_entry.get("order"),
            status="live",
            evidence=f"{route_file}:{line}",
            note=route_name_match.group(1) if route_name_match else None,
        ))

    # Plain <Route> blocks in AppRoutes (redirects)
    plain_in_app_pat = re.compile(
        r'<Route\s+path=["\']([^"\']+)["\'][^>]*>(?:\s*<(?:RedirectTo|RedirectWith\w+)[^/]*/>\s*)?</Route>',
        re.DOTALL
    )
    existing_app_paths = {r["path"] for r in routes if r["auth"]["type"] == "authenticated"}
    for m in plain_in_app_pat.finditer(app_text):
        route_path = m.group(1)
        if route_path in existing_app_paths:
            continue
        block = m.group(0)
        redirect_target = None
        rt_m = re.search(r'to=["\']([^"\']+)["\']', block)
        if rt_m:
            redirect_target = rt_m.group(1)

        # Also match <Route path="..."> <RedirectTo to="..." /> </Route>
        comp_match = re.search(r'<(\w+)\s+', block)
        component = comp_match.group(1) if comp_match and comp_match.group(1) != "Route" else "Redirect"

        line = line_number_of(text, app_start + m.start())
        nav_entry = nav_map.get(route_path, {})
        routes.append(make_route(
            app="crm7",
            path=route_path,
            route_file=route_file,
            component=component,
            layout="none",
            auth_type="authenticated",
            permissions=[],
            nav_surface=nav_entry.get("surface", "none"),
            nav_group=nav_entry.get("group"),
            nav_label=nav_entry.get("label"),
            nav_icon=nav_entry.get("icon"),
            nav_order=nav_entry.get("order"),
            status="redirect",
            evidence=f"{route_file}:{line}",
            note=f"→ {redirect_target}" if redirect_target else None,
        ))

    # Also handle Route blocks with body:  <Route path="...">\n<RedirectTo/>\n</Route>
    plain_body_pat = re.compile(
        r'<Route\s+path=["\']([^"\']+)["\']>\s*\n\s*<(RedirectTo|RedirectWith\w+)\s+to=["\']([^"\']+)["\']',
        re.DOTALL
    )
    existing_paths_full = {r["path"] for r in routes}
    for m in plain_body_pat.finditer(app_text):
        route_path = m.group(1)
        if route_path in existing_paths_full:
            continue
        redirect_target = m.group(3)
        line = line_number_of(text, app_start + m.start())
        nav_entry = nav_map.get(route_path, {})
        routes.append(make_route(
            app="crm7",
            path=route_path,
            route_file=route_file,
            component="Redirect",
            layout="none",
            auth_type="authenticated",
            permissions=[],
            nav_surface=nav_entry.get("surface", "none"),
            nav_group=nav_entry.get("group"),
            nav_label=nav_entry.get("label"),
            nav_icon=nav_entry.get("icon"),
            nav_order=nav_entry.get("order"),
            status="redirect",
            evidence=f"{route_file}:{line}",
            note=f"→ {redirect_target}",
        ))

    return routes


def extract_bsu_routes(nav_map):
    """
    Parse business-suite-unified/src/components/AppContent.tsx.
    Also parses business-suite-unified/src/pages/Developer/index.tsx for /developer/* sub-routes.
    """
    route_file = "business-suite-unified/src/components/AppContent.tsx"
    dev_route_file = "business-suite-unified/src/pages/Developer/index.tsx"
    text = read_file(route_file)
    dev_text = read_file(dev_route_file)
    routes = []

    # ---- Outer (public) Routes (~line 460-536) ----
    # Find the outer Routes block (not inside MainApp)
    outer_routes_start = text.find("return (\n    <Suspense fallback={<LoadingScreen />}>")
    if outer_routes_start == -1:
        outer_routes_start = text.find("<Routes>", text.find("export function AppContent"))
    outer_routes_end = text.find("</Suspense>", outer_routes_start) + len("</Suspense>")
    outer_text = text[outer_routes_start:outer_routes_end] if outer_routes_start != -1 else ""

    # ---- Inner authenticated Routes (inside MainApp, ~line 277-393) ----
    main_app_start = text.find("function MainApp()")
    main_app_end = text.find("\nfunction AppContent")
    inner_text = text[main_app_start:main_app_end] if main_app_start != -1 else ""

    def parse_rr6_routes(section_text, auth_type, layout, section_offset):
        """Parse React Router v6 <Route path="..." element={...} /> blocks.

        Uses find_jsx_tags() instead of regex so that element={<Foo />} and
        element={<Wrapper><Foo /></Wrapper>} are captured correctly — the old
        [^>] regex broke on any '>' inside attribute values.
        """
        results = []
        tags = find_jsx_tags(section_text, "Route")

        for (tag_start, attrs, is_self_closing) in tags:
            path_match = re.search(r'path=["\']([^"\']+)["\']', attrs)
            if not path_match:
                continue
            route_path = path_match.group(1)

            # Navigate = redirect.
            #
            # `\s*` after the brace is load-bearing. `/settings/branding` is the
            # one BSU redirect written across several lines —
            #
            #     element={
            #       <Navigate to="/branding" replace />
            #     }
            #
            # — and the old `element=\{<Navigate` required the tag to sit
            # immediately against the brace, so that route alone came out
            # status:"live" with component "Navigate": a record claiming a page
            # exists at a path that only bounces. Its `note` already read
            # "→ /branding", because the separate `to=` search never cared about
            # the layout — the two halves of the same record disagreed.
            is_redirect = bool(re.search(r'element=\{\s*<Navigate[\s/]', attrs))
            to_match = re.search(r'to=["\']([^"\']+)["\']', attrs)
            redirect_target = to_match.group(1) if to_match else None

            # element={...} — attrs already has brace-balanced content
            elem_match = re.search(r'element=\{(.+)\}', attrs, re.DOTALL)
            component = extract_component_name("element={" + (elem_match.group(1) if elem_match else "") + "}")

            # Auth guards
            has_access_guard = "AccessGuard" in attrs
            has_platform_kit = "canUsePlatformKit" in attrs

            perms = []
            if has_access_guard:
                ag_m = re.search(r'AccessGuard\([^,]+,\s*\{[^}]*minimumRole=(\w+)', attrs)
                if ag_m:
                    perms = [f"minimumRole={ag_m.group(1)}"]

            page_grid = "PageGridRoute" in attrs
            actual_layout = "AppShell+PageGrid" if page_grid else layout

            line = line_number_of(text, section_offset + tag_start)
            nav_entry = nav_map.get(route_path, {})
            results.append(make_route(
                app="bsu",
                path=route_path,
                route_file=route_file,
                component=component,
                layout=actual_layout,
                auth_type=auth_type,
                permissions=perms,
                feature_flags=["canUsePlatformKit"] if has_platform_kit else [],
                nav_surface=nav_entry.get("surface", "none"),
                nav_group=nav_entry.get("group"),
                nav_label=nav_entry.get("label"),
                nav_icon=nav_entry.get("icon"),
                nav_order=nav_entry.get("order"),
                status="redirect" if is_redirect else "live",
                evidence=f"{route_file}:{line}",
                note=f"→ {redirect_target}" if redirect_target else None,
            ))
        return results

    routes.extend(parse_rr6_routes(outer_text, "public", "none", outer_routes_start if outer_routes_start != -1 else 0))
    routes.extend(parse_rr6_routes(inner_text, "authenticated", "AppShell", main_app_start if main_app_start != -1 else 0))

    # ---- Developer sub-routes (/developer/*) ----
    existing_paths = {r["path"] for r in routes}
    dev_tags = find_jsx_tags(dev_text, "Route")
    for (tag_start, attrs, is_self_closing) in dev_tags:
        path_match = re.search(r'path=["\']([^"\']+)["\']', attrs)
        if not path_match:
            continue
        sub_path = path_match.group(1)
        full_path = "/developer/" + sub_path if not sub_path.startswith("/") else sub_path

        if full_path in existing_paths:
            continue

        is_redirect = bool(re.search(r'element=\{<Navigate[\s/]', attrs))
        to_match = re.search(r'to=["\']([^"\']+)["\']', attrs)
        redirect_target = to_match.group(1) if to_match else None

        elem_match = re.search(r'element=\{(.+)\}', attrs, re.DOTALL)
        component = extract_component_name("element={" + (elem_match.group(1) if elem_match else "") + "}")

        line = line_number_of(dev_text, tag_start)
        nav_entry = nav_map.get(full_path, {})
        routes.append(make_route(
            app="bsu",
            path=full_path,
            route_file=dev_route_file,
            component=component,
            layout="AppShell",
            auth_type="authenticated",
            permissions=["canUsePlatformKit"],
            nav_surface=nav_entry.get("surface", "none"),
            nav_group=nav_entry.get("group"),
            nav_label=nav_entry.get("label"),
            nav_icon=nav_entry.get("icon"),
            nav_order=nav_entry.get("order"),
            status="redirect" if is_redirect else "live",
            evidence=f"{dev_route_file}:{line}",
            note=f"→ {redirect_target}" if redirect_target else None,
        ))

    return routes


def extract_conduit_routes(nav_map):
    """
    Walk conduit/src/app/ for page.tsx and route.ts files.
    Convert filesystem paths to URL paths, handling route groups and dynamic segments.
    """
    app_dir = os.path.join(REPO_ROOT, "conduit", "src", "app")
    routes = []

    # Middleware to determine public paths
    middleware_text = read_file("conduit/src/lib/supabase/middleware.ts")
    public_path_patterns = [
        "/auth", "/portal/careers", "/portal/candidate",
        "/portal/talent-community", "/pricing", "/api/public",
    ]

    def fs_path_to_url(rel_path):
        """Convert conduit app dir relative path to URL path."""
        # Remove trailing /page.tsx or /route.ts
        parts = rel_path.replace("\\", "/").split("/")
        # Remove the file name
        parts = parts[:-1]
        url_parts = []
        for part in parts:
            # Route groups in parens — don't appear in URL
            if part.startswith("(") and part.endswith(")"):
                continue
            # Dynamic segments in brackets
            if part.startswith("[") and part.endswith("]"):
                segment = part[1:-1]
                url_parts.append(f":{segment}")
            else:
                url_parts.append(part)
        path = "/" + "/".join(url_parts) if url_parts else "/"
        # Clean up double slashes
        while "//" in path:
            path = path.replace("//", "/")
        return path

    def is_public_path(url_path):
        for p in public_path_patterns:
            if url_path.startswith(p):
                return True
        return False

    # Walk the app directory
    for dirpath, dirnames, filenames in os.walk(app_dir):
        # Skip __tests__, _private, etc.
        dirnames[:] = sorted([d for d in dirnames if not d.startswith("_") and not d.startswith(".")])
        for filename in sorted(filenames):
            if filename not in ("page.tsx", "route.ts"):
                continue
            full_path = os.path.join(dirpath, filename)
            rel_from_app = os.path.relpath(full_path, app_dir)
            url_path = fs_path_to_url(rel_from_app)
            route_file = "conduit/src/app/" + rel_from_app.replace("\\", "/")

            auth_type = "public" if is_public_path(url_path) else "authenticated"
            # auth page routes
            if url_path.startswith("/auth"):
                auth_type = "public"

            status = "live"
            component = "Page" if filename == "page.tsx" else "ApiRoute"
            layout = "none"
            if auth_type == "authenticated":
                # Check if it's under (dashboard)
                if "(dashboard)" in rel_from_app or "dashboard" in rel_from_app.split("/")[0]:
                    layout = "DashboardShell"

            # Read the file to check for redirects
            file_content = read_file(route_file)
            if "redirect(" in file_content.lower() or "permanentRedirect(" in file_content:
                status = "redirect"

            nav_entry = nav_map.get(url_path, {})

            # Check conduit/src/app/dashboard/page.tsx — this redirects to (dashboard)
            if url_path == "/dashboard" and "page.tsx" in route_file:
                status = "redirect"

            routes.append(make_route(
                app="conduit",
                path=url_path,
                route_file=route_file,
                component=component,
                layout=layout,
                auth_type=auth_type,
                permissions=[],
                nav_surface=nav_entry.get("surface", "none"),
                nav_group=nav_entry.get("group"),
                nav_label=nav_entry.get("label"),
                nav_icon=nav_entry.get("icon"),
                nav_order=nav_entry.get("order"),
                status=status,
                evidence=f"{route_file}:1",
            ))

    return routes


def extract_r80_routes(nav_map):
    """
    R80.4/src/main.tsx hand-rolls its router: a `Root()` function of plain
    if-statements over a normalised path.

    THIS USED TO BE A HARDCODED TABLE, AND ALL THREE OF ITS ROWS HAD GONE STALE.

    The table asserted ("/", "ChargeRateCalculator", "authenticated", 205).
    Every field of that row was wrong by 2026-08-25:

      * the component identifier is `ChargeCalculator`, not
        `ChargeRateCalculator` — no such symbol exists in the app;
      * `/` is PUBLIC. Operator ruling 2026-08-18 removed the sign-in redirect
        (`AuthGate` renders the calculator whatever the session state is, see
        the long comment in main.tsx); the table still said `authenticated`;
      * line 205 is inside a DOC COMMENT. The line finder searched for
        `CURRENT_PATH === "..."`, but Root() switches on `ROUTE_PATH` — it has
        since the legacy `/dashboard` alias landed — so the regex matched
        nothing for every row and each one silently fell back to its hardcoded
        `approx_line`. Three fabricated evidence citations that all pointed at
        prose.

    It also under-reported: `/calculate` is a live alias in CALCULATOR_PATHS and
    had no record at all, and the NotFound branch was undocumented.

    So this now DERIVES from the source. A hardcoded table cannot go stale
    loudly — it goes stale silently and keeps printing, which is worse than not
    covering the app at all.
    """
    route_file = "R80.4/src/main.tsx"
    text = read_file(route_file)

    root_start = text.find("function Root()")
    if root_start == -1:
        root_start = 0
    root_end = text.find("\n}", root_start)
    root_text = text[root_start:root_end if root_end != -1 else len(text)]

    def line_of(pattern, fallback_offset=root_start):
        m = re.search(pattern, root_text)
        return line_number_of(text, root_start + m.start()) if m else line_number_of(text, fallback_offset)

    routes_data = []

    # 1. The explicit `if (ROUTE_PATH === '<path>') return <Component />;` arms.
    #    Accept either identifier so a future rename of the routing variable
    #    does not silently re-open the stale-line hole this replaced.
    arm_pat = re.compile(
        r'if\s*\(\s*(?:ROUTE_PATH|CURRENT_PATH)\s*===\s*["\']([^"\']+)["\']\s*\)\s*'
        r'return\s*<\s*([A-Z]\w*)'
    )
    for m in arm_pat.finditer(root_text):
        routes_data.append((
            m.group(1), m.group(2), "public", "none", "live",
            line_number_of(text, root_start + m.start()), None,
        ))

    # 2. The calculator set. `if (!CALCULATOR_PATHS.has(ROUTE_PATH)) return
    #    <NotFound />; return <AuthGate />;` — so every member of the set
    #    renders AuthGate, which renders the lazily-imported calculator inside
    #    AppShell. The RENDERED page is what belongs in a route inventory, not
    #    the gate wrapper, so resolve one hop through it.
    calc_component = "AuthGate"
    gate_m = re.search(r'function\s+AuthGate\s*\(\)', text)
    if gate_m:
        gate_end = text.find("\n}", gate_m.start())
        gate_body = text[gate_m.start():gate_end if gate_end != -1 else len(text)]
        inner = re.findall(r'<([A-Z]\w+)\s*/>', gate_body)
        for tag in inner:
            if tag not in ("Suspense", "AppShell"):
                calc_component = tag
                break

    calc_set_m = re.search(r'CALCULATOR_PATHS\s*=\s*new\s+Set\(\[(.*?)\]\)', text, re.DOTALL)
    calc_paths = []
    if calc_set_m:
        calc_paths = re.findall(r'["\']([^"\']+)["\']', calc_set_m.group(1))
    calc_line = line_of(r'CALCULATOR_PATHS\.has')
    seen_calc = set()
    for p in calc_paths:
        # '/calculate/' and '/calculate' are the same route: normalisePath()
        # strips the trailing slash before Root() ever sees it. Record the
        # normalised form once rather than inventing a second route.
        norm = p[:-1] if len(p) > 1 and p.endswith("/") else p
        if norm in seen_calc:
            continue
        seen_calc.add(norm)
        routes_data.append((
            norm, calc_component, "public", "AppShell", "live", calc_line,
            None if norm == "/" else "alias of / — both members of CALCULATOR_PATHS",
        ))

    # 3. The catch-all. Recorded because an app whose not-found route is absent
    #    from the inventory is an app whose 404 nobody probes — the exact defect
    #    NotFound.tsx was written to close.
    nf_m = re.search(r'return\s*<NotFound\s*/>', root_text)
    if nf_m:
        routes_data.append((
            "*", "NotFound", "public", "none", "live",
            line_number_of(text, root_start + nf_m.start()),
            "catch-all: any path outside CALCULATOR_PATHS and the two auth paths",
        ))

    routes = []
    for path, component, auth_type, layout, status, line, note in routes_data:
        nav_entry = nav_map.get(path, {})
        routes.append(make_route(
            app="r80",
            path=path,
            route_file=route_file,
            component=component,
            layout=layout,
            auth_type=auth_type,
            permissions=[],
            nav_surface=nav_entry.get("surface", "none"),
            nav_group=nav_entry.get("group"),
            nav_label=nav_entry.get("label"),
            nav_icon=nav_entry.get("icon"),
            nav_order=nav_entry.get("order"),
            status=status,
            evidence=f"{route_file}:{line}",
            note=note,
        ))

    return routes


def extract_braden_routes(nav_map):
    """
    Parse braden/src/Routes.tsx (React Router v7) using JSX-aware tag finder.
    """
    route_file = "braden/src/Routes.tsx"
    text = read_file(route_file)
    routes = []

    fn_start = text.find("export function Routes()")
    if fn_start == -1:
        fn_start = 0

    tags = find_jsx_tags(text[fn_start:], "Route")

    # Scope tracking for nested routes
    scope_stack = []
    seen_paths = set()

    for (tag_start, attrs, is_self_closing) in tags:
        abs_start = fn_start + tag_start
        while scope_stack and scope_stack[-1][0] <= abs_start:
            scope_stack.pop()

        parent_path = scope_stack[-1][1] if scope_stack else ""

        path_match = re.search(r'path=["\']([^"\']+)["\']', attrs)
        is_index = re.search(r'\bindex\b', attrs) and not path_match

        if is_index:
            route_path = (parent_path.rstrip("/") + "/") if parent_path else "/"
        elif path_match:
            raw = path_match.group(1)
            if raw.startswith("/"):
                route_path = raw
            elif raw == "*":
                route_path = (parent_path.rstrip("/") + "/*") if parent_path else "/*"
            else:
                route_path = parent_path.rstrip("/") + "/" + raw
        else:
            if not is_self_closing:
                close_pos = text.find("</Route>", abs_start + len(attrs) + 7)
                if close_pos != -1:
                    scope_stack.append((close_pos, parent_path))
            continue

        if not is_self_closing:
            close_pos = text.find("</Route>", abs_start + len(attrs) + 7)
            if close_pos != -1:
                scope_stack.append((close_pos, route_path))

        elem_match = re.search(r'element=\{(.+)\}', attrs, re.DOTALL)
        component = extract_component_name("element={" + (elem_match.group(1) if elem_match else "") + "}")

        is_redirect = elem_match and ("Navigate" in (elem_match.group(1) or "") or "PortalMoved" in (elem_match.group(1) or ""))
        to_match = re.search(r'to=["\']([^"\']+)["\']', attrs)
        redirect_target = to_match.group(1) if to_match else None

        # For index routes at same path as parent, prefer index component
        if route_path in seen_paths:
            if is_index and component and component not in ("Layout", "Unknown"):
                for existing in routes:
                    if existing["path"] == route_path and existing["app"] == "braden":
                        existing["component"] = component
                        break
            continue
        seen_paths.add(route_path)

        admin_paths = {"/admin/auth", "/admin/branding", "/admin/page-builder",
                       "/admin/marketing", "/admin"}
        auth_type = "admin" if route_path in admin_paths or route_path.startswith("/admin") else "public"

        line = line_number_of(text, abs_start)
        nav_entry = nav_map.get(route_path, {})

        routes.append(make_route(
            app="braden",
            path=route_path,
            route_file=route_file,
            component=component,
            layout="Layout" if not route_path.startswith("/auth") else "none",
            auth_type=auth_type,
            permissions=[],
            nav_surface=nav_entry.get("surface", "none"),
            nav_group=nav_entry.get("group"),
            nav_label=nav_entry.get("label"),
            nav_icon=nav_entry.get("icon"),
            nav_order=nav_entry.get("order"),
            status="redirect" if is_redirect else "live",
            evidence=f"{route_file}:{line}",
            note=f"→ {redirect_target}" if redirect_target else None,
        ))

    return routes


def extract_throughput_routes(nav_map):
    """
    Parse throughput/src/App.tsx (React Router v7).
    """
    route_file = "throughput/src/App.tsx"
    text = read_file(route_file)
    routes = []

    # Find App function routes section
    app_fn_start = text.find("function App()")
    if app_fn_start == -1:
        app_fn_start = 0

    # Use JSX-aware tag finder to handle element={<Component />} correctly
    tags = find_jsx_tags(text[app_fn_start:], "Route")

    # Build a nesting map: for each tag, determine its parent path.
    # Non-self-closing tags with a path or wrapper create a scope.
    # We track scope by character position.
    scope_stack = []  # list of (end_pos, parent_path)

    seen_paths = set()
    for (tag_start, attrs, is_self_closing) in tags:
        # Pop expired scopes
        abs_start = app_fn_start + tag_start
        while scope_stack and scope_stack[-1][0] <= abs_start:
            scope_stack.pop()

        parent_path = scope_stack[-1][1] if scope_stack else ""

        path_match = re.search(r'path=["\']([^"\']+)["\']', attrs)
        is_index = re.search(r'\bindex\b', attrs) and not path_match

        if is_index:
            route_path = (parent_path.rstrip("/") + "/") if parent_path else "/"
        elif path_match:
            raw = path_match.group(1)
            if raw.startswith("/"):
                route_path = raw
            elif raw == "*":
                route_path = (parent_path.rstrip("/") + "/*") if parent_path else "/*"
            else:
                route_path = parent_path.rstrip("/") + "/" + raw
        else:
            # No path — just a wrapper. Push scope if not self-closing.
            if not is_self_closing:
                # Find the closing </Route> for this opening tag
                close_pos = text.find("</Route>", abs_start + len(attrs) + 7)
                if close_pos != -1:
                    scope_stack.append((close_pos, parent_path))
            continue

        # If this tag is not self-closing, it has children — push scope
        if not is_self_closing:
            close_pos = text.find("</Route>", abs_start + len(attrs) + 7)
            if close_pos != -1:
                scope_stack.append((close_pos, route_path))

        elem_match = re.search(r'element=\{(.+)\}', attrs, re.DOTALL)
        component = extract_component_name("element={" + (elem_match.group(1) if elem_match else "") + "}")

        is_redirect = elem_match and "Navigate" in (elem_match.group(1) or "")
        to_match = re.search(r'to=["\']([^"\']+)["\']', attrs)

        # For index routes at the same path as a parent wrapper, prefer
        # the index child's component over the wrapper's.
        if route_path in seen_paths:
            if is_index and component and component not in ("Layout", "ProtectedRoute", "Unknown"):
                # Update the existing route's component
                for existing in routes:
                    if existing["path"] == route_path and existing["app"] == "throughput":
                        existing["component"] = component
                        break
            continue
        seen_paths.add(route_path)

        # Auth determination
        # Routes inside ProtectedRoute wrapper = authenticated
        # Public: /auth/callback, /login, /auth/login, /pricing
        # Protected under Layout: /, /teams, /launch, /analytics, etc.
        public_paths = {"/auth/callback", "/login", "/auth/login", "/pricing"}
        auth_type = "public" if route_path in public_paths else "authenticated"
        if route_path == "/monitoring":
            auth_type = "authenticated"

        line = line_number_of(text, app_fn_start + tag_start)
        nav_entry = nav_map.get(route_path, {})

        # Check nav map — /todos has no backing route
        note = None
        if route_path in nav_map and nav_map[route_path].get("label") == "Todos":
            # /todos is in nav but not in routes
            pass

        routes.append(make_route(
            app="throughput",
            path=route_path,
            route_file=route_file,
            component=component if component else "Unknown",
            layout="Layout" if auth_type == "authenticated" and route_path != "/monitoring" else "none",
            auth_type=auth_type,
            permissions=[],
            nav_surface=nav_entry.get("surface", "none"),
            nav_group=nav_entry.get("group"),
            nav_label=nav_entry.get("label"),
            nav_icon=nav_entry.get("icon"),
            nav_order=nav_entry.get("order"),
            status="redirect" if is_redirect else "live",
            evidence=f"{route_file}:{line}",
            note=f"→ {to_match.group(1)}" if is_redirect and to_match else note,
        ))

    # Nested child routes for ideas/:id are now handled by the main loop
    # via scope tracking. No separate handler needed.

    # /todos was removed (dead nav link, no backing route).
    # Previously injected as an orphan entry — removed 2026-08-14.

    return routes


# ---------------------------------------------------------------------------
# Deduplication helper
# ---------------------------------------------------------------------------

def dedup_routes(routes):
    """Remove duplicate (app, path) pairs, keeping the first occurrence."""
    seen = set()
    result = []
    for r in routes:
        key = (r["app"], r["path"])
        if key not in seen:
            seen.add(key)
            result.append(r)
    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Reachability (bsuite#2012)
# ---------------------------------------------------------------------------

def annotate_reachability(routes):
    """
    Fill each route's `reachable_via`.

    WHY THIS EXISTS
    ---------------
    `nav.surface` is parsed from each app's nav CONFIG. It answers "is this route
    listed in the sidebar/topnav config?" and nothing else. A page reached through
    an in-page tab bar or a parent-section card grid is `surface: "none"`, so it
    was counted as an orphan even after it had been made reachable.

    That produced a concretely wrong number: crm7#1732 wired 45 unreachable pages
    into sub-navigation — verified live on the deployed preview, /documents going
    from 3/5 to 5/5 probe hits at every breakpoint — and the orphan count did not
    move by one.

    HOW
    ---
    A route is `in_page_nav` when some OTHER route's source file contains its
    literal path in a link/navigate position. That is deliberately the same signal
    a human uses when auditing "can I get here from the parent page?", and it is
    why the detection is cheap: the parent index files are already on disk.

    Precision notes, stated because a reachability metric that silently
    over-reports is worse than none:
      - Only paths with >= 2 segments are matched. A bare "/" or "/admin" appears
        in too many unrelated strings to be evidence of anything.
      - Parameterised paths (":", "*") are never matched — a literal
        "/people/:id" is not what a link contains.
      - The match must be inside quotes, so a path named in a comment does not
        count as a link.
    """
    by_app = {}
    for r in routes:
        by_app.setdefault(r["app"], []).append(r)

    # Cache each app's source text once — these files are large and re-read per
    # route would be O(routes x files).
    app_dirs = {
        "crm7": "crm7/src", "bsu": "business-suite-unified/src",
        "conduit": "conduit/src", "r80": "R80.4/src",
        "braden": "braden/src", "throughput": "throughput/src",
    }
    corpus = {}
    for app, rel in app_dirs.items():
        base = os.path.join(REPO_ROOT, rel)
        blob = []
        for root, _dirs, files in os.walk(base):
            if "node_modules" in root:
                continue
            for fn in files:
                if not fn.endswith((".tsx", ".ts")) or ".test." in fn:
                    continue
                try:
                    with open(os.path.join(root, fn), "r", encoding="utf-8") as fh:
                        blob.append(fh.read())
                except OSError:
                    pass
        corpus[app] = "\n".join(blob)

    for r in routes:
        surface = r.get("nav", {}).get("surface", "none")
        if surface in ("sidebar", "topnav", "header", "footer", "bottom"):
            r["reachable_via"] = surface
            continue
        if r.get("status") == "redirect":
            r["reachable_via"] = "redirect"
            continue

        path = r["path"]
        if ":" in path or "*" in path:
            # Detail/param routes are reached by clicking a row, not by a literal
            # link. Calling them orphans has always been wrong.
            r["reachable_via"] = "dynamic_from_list"
            continue
        if path.count("/") < 2:
            r["reachable_via"] = "top_level"
            continue

        text = corpus.get(r["app"], "")
        candidates = [path]
        # Nested routers register children RELATIVELY: the BSU Developer Portal
        # lists `path: 'route-inspector'`, never '/developer/route-inspector'.
        # Matching only the absolute form reported a tab that plainly renders in
        # the UI as unreachable. Only the last segment is added, and only when it
        # is distinctive enough (>= 4 chars, contains a hyphen or is not a common
        # word) to avoid matching unrelated strings.
        last = path.rsplit("/", 1)[-1]
        if len(last) >= 4 and last not in ("new", "edit", "list", "view", "index", "create"):
            candidates.append(last)
        if any(
            ("'" + c + "'") in text or ('"' + c + '"') in text or ("`" + c + "`") in text
            for c in candidates
        ):
            r["reachable_via"] = "in_page_nav"
        else:
            r["reachable_via"] = "none"

    return routes


def main():
    print(f"Repo root: {REPO_ROOT}")
    print("Building nav maps...")

    crm7_nav = build_crm7_nav_map()
    bsu_nav = build_bsu_nav_map()
    conduit_nav = build_conduit_nav_map()
    r80_nav = build_r80_nav_map()
    braden_nav = build_braden_nav_map()
    throughput_nav = build_throughput_nav_map()

    print(f"  crm7 nav entries: {len(crm7_nav)}")
    print(f"  bsu nav entries: {len(bsu_nav)}")
    print(f"  conduit nav entries: {len(conduit_nav)}")
    print(f"  r80 nav entries: {len(r80_nav)}")
    print(f"  braden nav entries: {len(braden_nav)}")
    print(f"  throughput nav entries: {len(throughput_nav)}")

    print("Extracting routes...")

    all_routes = []

    crm7_routes = extract_crm7_routes(crm7_nav)
    print(f"  crm7: {len(crm7_routes)} routes")
    all_routes.extend(crm7_routes)

    bsu_routes = extract_bsu_routes(bsu_nav)
    print(f"  bsu: {len(bsu_routes)} routes")
    all_routes.extend(bsu_routes)

    conduit_routes = extract_conduit_routes(conduit_nav)
    print(f"  conduit: {len(conduit_routes)} routes")
    all_routes.extend(conduit_routes)

    r80_routes = extract_r80_routes(r80_nav)
    print(f"  r80: {len(r80_routes)} routes")
    all_routes.extend(r80_routes)

    braden_routes = extract_braden_routes(braden_nav)
    print(f"  braden: {len(braden_routes)} routes")
    all_routes.extend(braden_routes)

    throughput_routes = extract_throughput_routes(throughput_nav)
    print(f"  throughput: {len(throughput_routes)} routes")
    all_routes.extend(throughput_routes)

    annotate_reachability(all_routes)

    # Dedup
    all_routes = dedup_routes(all_routes)

    # After dedup, so the Outlet lookup sees the surviving records.
    assert_structural_are_structural(all_routes)
    annotate_component_files(all_routes)

    # Sort by (app, path) — both alphabetically
    all_routes.sort(key=lambda r: (r["app"], r["path"]))

    output = {
        # 1.2 adds the nullable `component_file` to every route. Additive only —
        # no field was renamed or removed, so an existing consumer that ignores
        # it keeps working.
        "schema_version": "1.2",
        "routes": all_routes,
    }

    # Write output — deterministic JSON, no timestamps
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, sort_keys=False, ensure_ascii=False)
        f.write("\n")

    total = len(all_routes)
    print(f"\nWrote {total} routes to {OUTPUT_PATH}")

    # ------------------------------------------------------------------
    # Vendored copies for app bundles.
    #
    # The BSU Developer Portal's Route Inspector imports this JSON at build
    # time. It originally imported it from THIS path with a `../../../../`
    # escape out of the submodule. That resolves fine in a monorepo checkout
    # and fails hard on Vercel, which clones each submodule as a standalone
    # repo — the parent's docs/ simply does not exist there, so `vite build`
    # dies with UNRESOLVED_IMPORT on the main bundle.
    #
    # Writing the copy HERE, from the single generator, is what stops the two
    # from drifting. A copy made by hand is a copy that goes stale silently;
    # `.github/workflows/route-inventory.yml` re-runs this script on any PR
    # touching route files and fails on a diff, which now covers both paths.
    # ------------------------------------------------------------------
    for rel in VENDORED_COPIES:
        dest = os.path.join(REPO_ROOT, rel)
        if not os.path.isdir(os.path.dirname(os.path.dirname(dest))):
            # Submodule not checked out in this working tree — skip rather than
            # fabricate a directory tree inside a missing submodule.
            print(f"  (skipped vendored copy, submodule absent: {rel})")
            continue
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, sort_keys=False, ensure_ascii=False)
            f.write("\n")
        print(f"  vendored -> {rel}")

    # Summary by app
    from collections import Counter
    counts = Counter(r["app"] for r in all_routes)
    for app in sorted(counts):
        print(f"  {app}: {counts[app]}")


if __name__ == "__main__":
    main()
