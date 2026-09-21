import json
import os
from pathlib import Path
import stat
import sys

ROOT = Path('/home/braden/Desktop/Dev/bsuite/.devin/ci-runner')
STATE = ROOT / 'pilot-state-a6f71151.json'
state = json.loads(STATE.read_text())
result = json.loads((ROOT / 'pilot-result-a6f71151.json').read_text())
assert state['state'] == 'vm_stopped' and state['qemu_exit'] == 0
assert state['proxy_cleanup_confirmed'] is True
assert result['run_id'] == 35509467632 and result['runner_id'] == 21
assert result['conclusion'] == 'success' and result['registered_runners_after_job'] == 0
try:
    os.kill(state['qemu_wrapper_pid'], 0)
except ProcessLookupError:
    pass
else:
    raise RuntimeError('Recorded pilot process still exists; refusing disposal')
private = Path(state['private_runtime'])
disk = Path(state['disk'])
assert private == Path('/run/user/1000/devin-bsuite-pilot-a6f71151-z7nku2_w')
assert disk == ROOT / 'pilot-job-a6f71151.qcow2'
assert not private.is_symlink() and private.resolve() == private
assert not disk.is_symlink() and disk.resolve() == disk
assert private.stat().st_uid == os.getuid() and stat.S_IMODE(private.stat().st_mode) == 0o700
assert disk.stat().st_uid == os.getuid() and disk.is_file()
expected = {'user-data', 'meta-data', 'network-config', 'seed.img', 'console.log'}
files = list(private.iterdir())
assert {p.name for p in files} == expected
assert all(p.is_file() and not p.is_symlink() and p.stat().st_uid == os.getuid() for p in files)
print('Verified disposal scope: 5 private files and their owned directory; 1 owned pilot job overlay. Golden images, worktrees and branches excluded.')
if sys.argv[1:] == ['--apply']:
    for path in files:
        path.unlink()
    private.rmdir()
    disk.unlink()
    assert not private.exists() and not disk.exists()
    state['private_artifacts_retained_for_lead_disposal'] = False
    state['private_artifacts_disposed'] = True
    state['job_overlay_disposed'] = True
    STATE.write_text(json.dumps(state, indent=2) + '\n')
    print('Disposed owned pilot credentials/seed/console and job overlay; retained nonsecret result and reusable preparation.')
elif sys.argv[1:] != ['--dry-run']:
    raise SystemExit('Use --dry-run or --apply')
