#!/usr/bin/env bash
# Inline docs/dashboard/data/dashboard-data.json into docs/dashboard/index.html
# between <script id="dashboard-data" type="application/json"> and </script>.
#
# The HTML stores the data on a single line inside the script tag. We
# rewrite that line in-place so the dashboard stays self-contained
# (no fetch() at runtime — works from file:// and from Pages identically).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HTML="$DIR/index.html"
DATA="$DIR/data/dashboard-data.json"

if [[ ! -f "$HTML" ]]; then
  echo "missing $HTML" >&2
  exit 1
fi
if [[ ! -f "$DATA" ]]; then
  echo "missing $DATA" >&2
  exit 1
fi

python3 - "$HTML" "$DATA" <<'PY'
import json
import re
import sys
from pathlib import Path

html_path = Path(sys.argv[1])
data_path = Path(sys.argv[2])

html = html_path.read_text()
data = json.loads(data_path.read_text())
payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))

pattern = re.compile(
    r'(<script id="dashboard-data"[^>]*>)(.*?)(</script>)',
    re.DOTALL,
)

def repl(m: re.Match) -> str:
    return f"{m.group(1)}{payload}{m.group(3)}"

new_html, n = pattern.subn(repl, html, count=1)
if n == 0:
    sys.stderr.write("could not locate <script id=\"dashboard-data\"> block in index.html\n")
    sys.exit(1)

html_path.write_text(new_html)
PY

echo "inlined $(wc -c <"$DATA") bytes of JSON into $HTML"
