import { describe, expect, it, vi } from 'vitest';
import {
  AuthCoordinationUnavailableError,
  createAuthSessionCoordinator,
  type AuthSessionLock,
} from '../session-ownership.js';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => { resolve = r; });
  return { promise, resolve };
}

/** One deterministic lock manager shared by separately constructed tab contexts. */
function fixture() {
  const data = new Map<string, string>();
  const storage = {
    get length() { return data.size; },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
  let tail: Promise<unknown> = Promise.resolve();
  let active = 0;
  let maxActive = 0;
  const locks: AuthSessionLock = {
    runExclusive: (_name, signal, run) => {
      const result = tail.then(async () => {
        if (signal.aborted) throw new Error('aborted');
        active++;
        maxActive = Math.max(maxActive, active);
        try { return await run(); } finally { active--; }
      });
      tail = result.catch(() => undefined);
      return result;
    },
  };
  let id = 0;
  const env = { storage, locks, newId: () => `id-${++id}` };
  const a = createAuthSessionCoordinator(env);
  const b = createAuthSessionCoordinator(env);
  let session: string | null = 'old';
  const clear = vi.fn(async () => { session = null; });
  const publish = vi.fn(() => undefined);
  const adapter = (value: string) => ({
    clear, publish,
    apply: async () => { session = value; },
  });
  return { a, b, data, env, clear, publish, adapter,
    session: () => session, setSession: (value: string) => { session = value; },
    maxActive: () => maxActive };
}

describe('cross-context session ownership', () => {
  it('restores the original state binding in another context without adopting newer ownership', () => {
    const f = fixture();
    const original = f.a.beginSignIn();
    f.a.bind(original, 'state-a');
    const newer = f.b.beginSignIn();
    f.b.bind(newer, 'state-b');
    expect(f.b.readBinding('state-a')).toEqual(original);
    expect(f.b.isCurrent(f.b.readBinding('state-a')!)).toBe(false);
    expect(f.a.readBinding('state-b')).toEqual(newer);
  });

  it('bounds binding eligibility to ten minutes and prunes expired keys', () => {
    const f = fixture();
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    try {
      const attempt = f.a.beginSignIn();
      f.a.bind(attempt, 'expired');
      now.mockReturnValue(1_600_001);
      expect(f.b.readBinding('expired')).toBeNull();
      f.b.bind(attempt, 'fresh');
      expect(f.data.has('bs_auth_ownership_flow_expired')).toBe(false);
      expect(f.a.readBinding('fresh')).toEqual(attempt);
      now.mockReturnValue(1);
      expect(f.a.readBinding('fresh')).toBeNull();
    } finally { now.mockRestore(); }
  });

  it('rejects a superseded binding before a redirect can start', () => {
    const f = fixture();
    const old = f.a.beginSignIn();
    f.b.beginSignIn();
    expect(() => f.a.bind(old, 'stale')).toThrow('superseded');
    expect(f.b.readBinding('stale')).toBeNull();
  });
  it('commits a current login and keeps unrelated storage', async () => {
    const f = fixture();
    f.data.set('unrelated', 'keep');
    expect(await f.a.commit(f.a.beginSignIn(), f.adapter('new'))).toBe('committed');
    expect(f.session()).toBe('new');
    expect(f.publish).toHaveBeenCalledTimes(1);
    expect(f.clear).not.toHaveBeenCalled();
    expect(f.data.get('unrelated')).toBe('keep');
  });

  it.each(['success', 'failure'])('logout during an SDK %s clears before releasing the lock', async (outcome) => {
    const f = fixture();
    const entered = deferred(), finish = deferred();
    const snapshot = f.a.beginSignIn();
    const commit = f.a.commit(snapshot, {
      ...f.adapter('unused'),
      apply: async () => {
        entered.resolve();
        await finish.promise;
        f.setSession('stale-sdk-write');
        if (outcome === 'failure') throw new Error('partial write');
      },
    });
    await entered.promise;
    const logout = f.b.logout({ clear: f.clear });
    expect(f.a.isCurrent(snapshot)).toBe(false); // no await required
    finish.resolve();
    expect(await commit).toBe('superseded');
    await logout;
    expect(f.session()).toBeNull();
    expect(f.publish).not.toHaveBeenCalled();
    expect(f.maxActive()).toBe(1);
  });

  it('a newer successful login follows stale-write reconciliation', async () => {
    const f = fixture();
    const entered = deferred(), finish = deferred();
    const old = f.a.commit(f.a.beginSignIn(), {
      ...f.adapter('unused'),
      apply: async () => { entered.resolve(); await finish.promise; f.setSession('stale'); },
    });
    await entered.promise;
    const newer = f.b.commit(f.b.beginSignIn(), f.adapter('new'));
    finish.resolve();
    expect(await old).toBe('superseded');
    expect(await newer).toBe('committed');
    expect(f.session()).toBe('new');
    expect(f.publish).toHaveBeenCalledTimes(1);
  });

  it('failed newer sign-in cannot cancel pending logout', async () => {
    const f = fixture();
    const logout = f.a.logout({ clear: f.clear });
    f.b.beginSignIn(); // exchange fails outside commit; no session mutation
    await logout;
    expect(f.session()).toBeNull();
  });

  it('a late queued logout does not clear an already reconciled newer login', async () => {
    const f = fixture();
    // Delay only the old logout's lock request, as if its tab were suspended.
    const original = f.env.locks.runExclusive;
    const resume = deferred();
    let first = true;
    f.env.locks.runExclusive = (name, signal, run) => {
      if (first) { first = false; return resume.promise.then(() => original(name, signal, run)); }
      return original(name, signal, run);
    };
    const logout = f.a.logout({ clear: f.clear });
    expect(await f.b.commit(f.b.beginSignIn(), f.adapter('new'))).toBe('committed');
    resume.resolve();
    await logout;
    expect(f.session()).toBe('new');
    expect(f.clear).toHaveBeenCalledTimes(1);
  });

  it('reconciliation failure blocks publication and survives into the next context', async () => {
    const f = fixture();
    const fail = new Error('SDK clear failed');
    f.clear.mockRejectedValueOnce(fail);
    await expect(f.a.commit(f.a.beginSignIn(), {
      ...f.adapter('unused'),
      apply: async () => { f.setSession('partial'); throw new Error('apply failed'); },
    })).rejects.toBe(fail);
    expect(f.data.has('bs_auth_ownership_dirty')).toBe(true);
    expect(f.publish).not.toHaveBeenCalled();
    expect(await f.b.commit(f.b.beginSignIn(), f.adapter('new'))).toBe('committed');
    expect(f.clear).toHaveBeenCalledTimes(2);
    expect(f.session()).toBe('new');
  });

  it('does not run stale queued adapters or restore an older session', async () => {
    const f = fixture(), snapshot = f.a.beginSignIn();
    const stale = { ...f.adapter('stale'), apply: vi.fn(async () => {}) };
    const newer = f.b.beginSignIn();
    await f.b.commit(newer, f.adapter('new'));
    expect(await f.a.commit(snapshot, stale)).toBe('superseded');
    expect(stale.apply).not.toHaveBeenCalled();
    expect(f.session()).toBe('new');
  });

  it('rechecks logout arriving during reconciliation', async () => {
    const f = fixture(), entered = deferred(), finish = deferred();
    f.clear.mockImplementationOnce(async () => { entered.resolve(); await finish.promise; });
    const first = f.a.logout({ clear: f.clear });
    await entered.promise;
    const second = f.b.logout({ clear: f.clear });
    finish.resolve();
    await Promise.all([first, second]);
    expect(f.clear).toHaveBeenCalledTimes(2);
    expect(f.session()).toBeNull();
  });

  it('fails closed on denied shared storage before mutation', async () => {
    const f = fixture();
    f.env.storage.setItem = () => { throw new Error('denied'); };
    expect(() => f.a.beginSignIn()).toThrow(AuthCoordinationUnavailableError);
    expect(f.publish).not.toHaveBeenCalled();
  });

  it('fails explicitly when browser Web Locks are unavailable', () => {
    const previous = Object.getOwnPropertyDescriptor(navigator, 'locks');
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
    try { expect(() => createAuthSessionCoordinator()).toThrow(AuthCoordinationUnavailableError); }
    finally {
      if (previous) Object.defineProperty(navigator, 'locks', previous);
      else Reflect.deleteProperty(navigator, 'locks');
    }
  });
});
