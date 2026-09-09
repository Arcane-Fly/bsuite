/** Same-origin session mutation ordering. No token storage or SDK dependency. */
export interface AuthOwnershipSnapshot {
  readonly generation: string | null;
  readonly revocation: string | null;
}

export interface AuthSessionLock {
  runExclusive<T>(name: string, signal: AbortSignal, run: () => Promise<T>): Promise<T>;
}

export interface AuthOwnershipEnvironment {
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
  locks: AuthSessionLock;
  newId: () => string;
}

export class AuthCoordinationUnavailableError extends Error {
  readonly recovery = 'reload-in-supported-browser' as const;
  constructor() {
    super('Session coordination is unavailable. Reload in a browser with Web Locks and working local storage.');
    this.name = 'AuthCoordinationUnavailableError';
  }
}

export class AuthOwnershipSupersededError extends Error {
  constructor() {
    super('A newer sign-in or sign-out superseded this session operation.');
    this.name = 'AuthOwnershipSupersededError';
  }
}

export interface AuthCommitScope {
  isCurrent(): boolean;
  /** Call after adapter awaits and before any further side effect. */
  assertCurrent(): void;
}

export interface AuthSessionAdapter {
  /** Idempotently clear SDK session, BS tokens, cookies and markers. Throw on failure.
   * Must not invalidate ownership or recursively acquire this coordinator's lock.
   */
  clear(): Promise<void>;
}

export interface AuthSessionCommit extends AuthSessionAdapter {
  /** All session mutations (including native exchange) belong here, under the lock. */
  apply(scope: AuthCommitScope): Promise<void>;
  /** Synchronous final token/cookie publication and navigation. No detached promises. */
  publish(): undefined;
}

const PREFIX = 'bs_auth_ownership_';
const LOCK = `${PREFIX}mutation`;
const GENERATION = `${PREFIX}generation`;
const REVOKED = `${PREFIX}revoked`;
const ACKNOWLEDGED = `${PREFIX}acknowledged`;
const DIRTY = `${PREFIX}dirty`;
const BINDING = `${PREFIX}flow_`;
const BINDING_TTL_MS = 10 * 60_000;

function browserEnvironment(): AuthOwnershipEnvironment {
  try {
    if (!navigator.locks || !crypto.randomUUID) throw new Error('unsupported');
    return {
      storage: localStorage,
      newId: () => crypto.randomUUID(),
      locks: {
        runExclusive: (name, signal, run) =>
          navigator.locks.request(name, { mode: 'exclusive', signal }, run),
      },
    };
  } catch {
    throw new AuthCoordinationUnavailableError();
  }
}

/**
 * All writers on an origin must use this coordinator, including logout and background
 * bridging. The injected environment is for tests/platform adapters: its lock MUST
 * exclude every participating same-origin context. There is no localStorage lease
 * or module-queue fallback. Do not clear these metadata keys during token cleanup.
 */
export function createAuthSessionCoordinator(environment?: AuthOwnershipEnvironment) {
  const env = environment ?? browserEnvironment();
  function read(key: string): string | null {
    try { return env.storage.getItem(key); }
    catch { throw new AuthCoordinationUnavailableError(); }
  }
  function write(key: string, value: string): void {
    try { env.storage.setItem(key, value); }
    catch { throw new AuthCoordinationUnavailableError(); }
  }
  function remove(key: string): void {
    try { env.storage.removeItem(key); }
    catch { throw new AuthCoordinationUnavailableError(); }
  }
  function capture(): AuthOwnershipSnapshot {
    return Object.freeze({ generation: read(GENERATION), revocation: read(REVOKED) });
  }
  function isCurrent(snapshot: AuthOwnershipSnapshot): boolean {
    return snapshot.generation === read(GENERATION) && snapshot.revocation === read(REVOKED);
  }
  function beginSignIn(): AuthOwnershipSnapshot {
    const generation = env.newId();
    const revocation = read(REVOKED);
    write(GENERATION, generation);
    // Return OUR generation, never adopt a concurrent writer's later value.
    return Object.freeze({ generation, revocation });
  }
  function assertCurrent(snapshot: AuthOwnershipSnapshot): void {
    if (!isCurrent(snapshot)) throw new AuthOwnershipSupersededError();
  }
  function bindingKey(state: string): string {
    // OAuth state is opaque, but its length is bounded before use as a key.
    if (!state || state.length > 256) throw new Error('Invalid OAuth state binding');
    return BINDING + state;
  }
  function readBinding(state: string): AuthOwnershipSnapshot | null {
    const raw = read(bindingKey(state));
    if (!raw) return null;
    try {
      const value = JSON.parse(raw) as Record<string, unknown>;
      if (!value || typeof value !== 'object') return null;
      const age = Date.now() - Number(value.startedAt);
      if (typeof value.startedAt !== 'number' || !Number.isFinite(age) || age < 0 || age > BINDING_TTL_MS) return null;
      if (value.generation !== null && typeof value.generation !== 'string') return null;
      if (value.revocation !== null && typeof value.revocation !== 'string') return null;
      return Object.freeze({ generation: value.generation, revocation: value.revocation });
    } catch { return null; }
  }
  function bind(snapshot: AuthOwnershipSnapshot, state: string): undefined {
    assertCurrent(snapshot);
    // Independent per-state keys avoid cross-tab read/modify/write map loss.
    // Expired bindings are collected on each initiation; eligibility is always TTL checked.
    const keys: string[] = [];
    try {
      for (let i = 0; i < env.storage.length; i++) {
        const key = env.storage.key(i);
        if (key?.startsWith(BINDING)) keys.push(key);
      }
    } catch { throw new AuthCoordinationUnavailableError(); }
    for (const key of keys) {
      if (!readBinding(key.slice(BINDING.length))) remove(key);
    }
    const key = bindingKey(state);
    if (read(key) !== null) throw new Error('OAuth state already has an ownership binding');
    write(key, JSON.stringify({ ...snapshot, startedAt: Date.now() }));
    try { assertCurrent(snapshot); }
    catch (error) { remove(key); throw error; }
    return undefined;
  }
  async function locked<T>(run: () => Promise<T>): Promise<T> {
    const controller = new AbortController();
    // Only bound the wait to ACQUIRE a lock. Never release exclusion while an SDK
    // write remains in flight. Adapters must bound their own network operations.
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      return await env.locks.runExclusive(LOCK, controller.signal, async () => {
        clearTimeout(timeout);
        return run();
      });
    } catch (error) {
      if (controller.signal.aborted) throw new AuthCoordinationUnavailableError();
      throw error;
    } finally { clearTimeout(timeout); }
  }
  async function reconcile(adapter: AuthSessionAdapter): Promise<void> {
    // A logout request cannot be cancelled by a subsequent failed login. The
    // revocation marker is independent of the latest generation. A queued older
    // logout is harmless once a newer commit has already drained its revocation.
    while (read(DIRTY) !== null || read(REVOKED) !== read(ACKNOWLEDGED)) {
      const revision = read(REVOKED);
      write(DIRTY, env.newId());
      await adapter.clear();
      if (revision === null) remove(ACKNOWLEDGED);
      else write(ACKNOWLEDGED, revision);
      remove(DIRTY);
      // A new logout may arrive while clear awaits. Drain that revision as well.
    }
  }
  async function commit(
    snapshot: AuthOwnershipSnapshot,
    adapter: AuthSessionCommit,
  ): Promise<'committed' | 'superseded'> {
    return locked(async () => {
      await reconcile(adapter);
      if (!isCurrent(snapshot)) return 'superseded';
      const scope = {
        isCurrent: () => isCurrent(snapshot),
        assertCurrent: () => assertCurrent(snapshot),
      };
      write(DIRTY, env.newId());
      try {
        await adapter.apply(scope);
        assertCurrent(snapshot);
        adapter.publish();
        assertCurrent(snapshot);
        remove(DIRTY);
        return 'committed';
      } catch (error) {
        // Includes partial SDK writes and publish failures. Never restore a saved
        // token snapshot. No newer coordinated commit can run until cleanup ends.
        await reconcile(adapter);
        if (!isCurrent(snapshot)) return 'superseded';
        throw error;
      }
    });
  }
  function logout(adapter: AuthSessionAdapter): Promise<void> {
    // Synchronous invalidation, BEFORE waiting for any SDK write/lock. A single
    // storage assignment identifies each intent; localStorage is not used as a lock.
    const revision = env.newId();
    write(REVOKED, revision);
    write(GENERATION, revision);
    return locked(() => reconcile(adapter));
  }
  return { capture, beginSignIn, isCurrent, assertCurrent, bind, readBinding, commit, logout };
}
