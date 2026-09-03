/**
 * workflow-yaml.mjs — a minimal, indentation-aware reader for the subset of
 * YAML that GitHub Actions workflow files actually use.
 *
 * WHY NOT A REGEX, AND WHY NOT A DEPENDENCY.
 *
 * The estate has already been bitten three times in ONE checker by parsing the
 * LINE a construct starts on rather than the construct itself (bsuite memory:
 * "PARSE THE CONSTRUCT, never the line it starts on" — three line-oriented bugs,
 * each accusing a mounted component of being dead). A `grep -n 'paths:'` over a
 * workflow cannot tell `on.pull_request.paths` (which makes a check unable to
 * report on an unrelated PR) from `on.push.paths` (which is harmless for a PR
 * gate) from the word `paths:` inside a `run: |` block. Those three cases have
 * to be distinguished STRUCTURALLY or the answer is noise.
 *
 * The parent repo has no YAML dependency and adding one to the root would trip
 * `No new runtime dependency`. So this reads the subset that is present in
 * .github/workflows/: block mappings, block sequences, flow sequences of
 * scalars (`[main, development]`), quoted and bare scalars, block scalars
 * (`|`, `|-`, `>`, `>-`) consumed OPAQUELY so their contents are never mistaken
 * for structure, and comments.
 *
 * WHAT IT DOES NOT DO — stated so no caller assumes more than it delivers:
 *   - anchors/aliases (`&a` / `*a`), merge keys, tags, multi-document files,
 *     flow MAPPINGS (`{ node-version: '24' }` is returned as a raw string),
 *     nested flow sequences. None appear in the constructs this repo's gates
 *     interrogate (`on:`, `jobs.<id>.name`, `jobs.<id>.if`, `strategy.matrix`).
 *     A file using them still parses; the affected VALUE is returned as a
 *     string rather than a structure, and callers that need structure must
 *     check the type rather than assume it.
 *   - it does not evaluate `${{ }}` expressions. A caller asking "can this job
 *     be skipped" gets the expression TEXT and decides.
 */

/**
 * Parse a workflow's YAML text into plain JS values.
 * @param {string} text
 * @returns {Record<string, unknown>}
 */
export function parseWorkflowYaml(text) {
  const lines = String(text).split(/\r?\n/);
  // Pre-pass: a block scalar's BODY is consumed opaquely so the structural pass
  // can never mistake it for structure. A `run: |` body containing "  paths:"
  // is the exact false positive this exists to prevent. The body is still
  // FOLDED back onto its header line as a plain string, because a caller asking
  // "does this job carry an `if:`" needs the condition's text, and `if: >-`
  // writes that text on the following lines.
  const opaque = new Array(lines.length).fill(false);
  /** @type {Map<number, string>} */
  const folded = new Map();
  for (let i = 0; i < lines.length; i += 1) {
    if (opaque[i]) continue;
    const m = /^(\s*)(-\s+)?(?:[^#\s][^:]*)?:\s*[|>][+-]?\d*\s*(?:#.*)?$/.exec(lines[i]);
    if (!m) continue;
    // THE FLOOR IS THE KEY'S OWN INDENT, NOT THE DASH LINE'S.
    //
    // For `      - run: |` the dash sits at column 6 but the KEY starts at 8,
    // and the item's sibling keys (`shell:`, `env:`, a step-level `if:`) are at
    // 8 as well. Using the dash's indent as the floor swallowed every one of
    // them into the run body — `- run: | … shell: bash env: X: 1` parsed as a
    // single scalar with no `shell` key at all.
    //
    // Caught by the independent review of bsuite#2988, and it was LATENT rather
    // than harmless-by-design: this gate reads only `on`, `jobs.<id>.name`,
    // `.if` and `.strategy.matrix`, never a step field, so no required-context
    // verdict was ever wrong. The next caller to read step-level fields would
    // have been. Fixed at the source rather than noted as a limit, because a
    // known-wrong parser is a trap with a comment on it.
    const headerIndent = m[1].length + (m[2] ? m[2].length : 0);
    const body = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const raw = lines[j];
      if (raw.trim() === '') { opaque[j] = true; body.push(''); continue; }
      const ind = raw.length - raw.trimStart().length;
      if (ind <= headerIndent) break;
      opaque[j] = true;
      body.push(raw.trim());
    }
    folded.set(i, body.join(' ').trim());
  }

  /** @type {{indent:number, text:string, line:number}[]} */
  const nodes = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (opaque[i]) continue;
    const raw = lines[i];
    if (raw.trim() === '') continue;
    if (folded.has(i)) {
      // Rebuild as `key: <folded body>`. splitKey below re-splits it; the body
      // is never re-parsed for structure, and never comment-stripped (a `#`
      // inside a shell body is a comment in the SHELL, not in the YAML).
      // NB: the node keeps the DASH LINE's indent (raw's leading whitespace),
      // because readSequence keys off the dash's column; only the block
      // scalar's BODY floor moved above.
      const bare = stripComment(raw).trim();
      const dash = bare.startsWith('- ') ? '- ' : '';
      const key = splitKey(dash ? bare.slice(2).trim() : bare);
      const name = key ? key.name : bare.replace(/^-\s+/, '').replace(/:.*$/, '');
      nodes.push({ indent: raw.length - raw.trimStart().length, text: `${dash}${name}: ${JSON.stringify(folded.get(i))}`, line: i + 1 });
      continue;
    }
    const stripped = stripComment(raw);
    if (stripped.trim() === '') continue;
    nodes.push({ indent: raw.length - raw.trimStart().length, text: stripped.trim(), line: i + 1 });
  }

  const [value] = readBlock(nodes, 0, nodes.length ? nodes[0].indent : 0);
  return value && typeof value === 'object' ? value : {};
}

/** Remove a trailing `# comment`, respecting single and double quotes. */
function stripComment(raw) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < raw.length; i += 1) {
    const c = raw[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === '#' && !inSingle && !inDouble) {
      // A `#` only starts a comment at line start or after whitespace.
      if (i === 0 || /\s/.test(raw[i - 1])) return raw.slice(0, i);
    }
  }
  return raw;
}

/**
 * Read one block (mapping or sequence) starting at `start`, consuming every
 * node whose indent is >= `indent`. Returns [value, nextIndex].
 */
function readBlock(nodes, start, indent) {
  if (start >= nodes.length) return [null, start];
  if (nodes[start].text.startsWith('- ') || nodes[start].text === '-') {
    return readSequence(nodes, start, indent);
  }
  return readMapping(nodes, start, indent);
}

function readMapping(nodes, start, indent) {
  /** @type {Record<string, unknown>} */
  const out = {};
  let i = start;
  while (i < nodes.length && nodes[i].indent >= indent) {
    if (nodes[i].indent > indent) { i += 1; continue; } // defensive: stray deeper node
    const { text } = nodes[i];
    const key = splitKey(text);
    if (!key) { i += 1; continue; }
    const { name, rest } = key;
    if (rest !== '') {
      out[name] = scalar(rest);
      i += 1;
      continue;
    }
    // Value is on following, more-indented lines (or absent — `pull_request:`).
    const childStart = i + 1;
    if (childStart < nodes.length && nodes[childStart].indent > indent) {
      const [val, next] = readBlock(nodes, childStart, nodes[childStart].indent);
      out[name] = val;
      i = next;
    } else {
      out[name] = null;
      i = childStart;
    }
  }
  return [out, i];
}

function readSequence(nodes, start, indent) {
  /** @type {unknown[]} */
  const out = [];
  let i = start;
  while (i < nodes.length && nodes[i].indent === indent && (nodes[i].text.startsWith('- ') || nodes[i].text === '-')) {
    const inline = nodes[i].text === '-' ? '' : nodes[i].text.slice(2).trim();
    if (inline === '') {
      const childStart = i + 1;
      if (childStart < nodes.length && nodes[childStart].indent > indent) {
        const [val, next] = readBlock(nodes, childStart, nodes[childStart].indent);
        out.push(val);
        i = next;
      } else {
        out.push(null);
        i = childStart;
      }
      continue;
    }
    const key = splitKey(inline);
    if (key) {
      // `- uses: x` / `- name: y` … a mapping whose first pair sits on the dash
      // line. Its remaining pairs are indented to the dash line + 2.
      const itemIndent = indent + 2;
      /** @type {Record<string, unknown>} */
      const item = {};
      if (key.rest !== '') item[key.name] = scalar(key.rest);
      else item[key.name] = null;
      let j = i + 1;
      if (key.rest === '' && j < nodes.length && nodes[j].indent > itemIndent) {
        const [val, next] = readBlock(nodes, j, nodes[j].indent);
        item[key.name] = val;
        j = next;
      }
      if (j < nodes.length && nodes[j].indent >= itemIndent && !nodes[j].text.startsWith('- ')) {
        const [rest, next] = readMapping(nodes, j, itemIndent);
        Object.assign(item, rest);
        j = next;
      }
      out.push(item);
      i = j;
      continue;
    }
    out.push(scalar(inline));
    i += 1;
  }
  return [out, i];
}

/** Split `key: value` honouring quoted keys; returns null when there is no key. */
function splitKey(text) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === ':' && !inSingle && !inDouble) {
      const after = text[i + 1];
      if (after === undefined || after === ' ' || after === '\t') {
        return { name: unquote(text.slice(0, i).trim()), rest: text.slice(i + 1).trim() };
      }
    }
  }
  return null;
}

function unquote(s) {
  if (s.length >= 2 && ((s[0] === "'" && s.at(-1) === "'") || (s[0] === '"' && s.at(-1) === '"'))) {
    return s.slice(1, -1);
  }
  return s;
}

function scalar(raw) {
  const s = raw.trim();
  if (s === '') return null;
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((p) => unquote(p.trim()));
  }
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  return unquote(s);
}

/**
 * The status-check CONTEXT a job reports under.
 *
 * GitHub names a check run after the job's `name:` when it has one, and after
 * the job ID when it does not — which is why `gates` and
 * `no-prerelease-in-production` are required under their bare job IDs while
 * every other context in this repo is a sentence. A MATRIX job appends the
 * matrix values in parentheses (`sast (crm7)`), so its bare name is NEVER a
 * context anyone can produce.
 *
 * @returns {{ base: string, matrix: boolean }}
 */
export function jobContext(jobId, job) {
  const base = typeof job?.name === 'string' && job.name.trim() !== '' ? job.name.trim() : jobId;
  const matrix = Boolean(job && typeof job === 'object' && job.strategy && typeof job.strategy === 'object' && job.strategy.matrix != null);
  return { base, matrix };
}
