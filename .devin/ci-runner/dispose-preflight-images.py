import json
import os
from pathlib import Path
import subprocess

root = Path('/home/braden/Desktop/Dev/bsuite/.devin/ci-runner')
check = subprocess.run(['pgrep', '-f', 'qemu-system-x86_64.*bsuite-ci-'], capture_output=True)
assert check.returncode == 1, 'A BSuite VM may still be running; refusing disposal'
info = json.loads(subprocess.check_output(['qemu-img', 'info', '--output=json', str(root / 'tooling/tooling.qcow2')], text=True))
assert info['full-backing-filename'] == str(root / 'ubuntu-24.04-server-cloudimg-amd64.img')
names = ['preflight.qcow2', 'seed.img', 'tooling/seed-tooling.img']
names += [f'network-preflight/network-preflight{suffix}.qcow2' for suffix in ['', '-b', '-c', '-neg']]
names += [f'network-preflight/seed-net{suffix}.img' for suffix in ['', '-b', '-c', '-neg']]
paths = [root / name for name in names]
for path in paths:
    assert not path.is_symlink() and path.resolve() == path
    assert path.is_file() and path.stat().st_uid == os.getuid()
for path in paths:
    path.unlink()
assert not any(path.exists() for path in paths)
receipt = {
    'disposed': names,
    'disposed_by': 'python3 -B /home/braden/Desktop/Dev/bsuite/.devin/ci-runner/dispose-preflight-images.py',
    'retained': 'Verified Ubuntu backing image, prepared tooling golden image, proxy image/configuration, source templates and diagnostic/evidence records',
    'backing_chain_verified': True,
    'reason': 'All 11 files were created for completed preparation tests; none backs the reusable tooling disk',
}
(root / 'preflight-disposal.json').write_text(json.dumps(receipt, indent=2) + '\n')
print('Removed 11 owned disposable test disks/seeds. Retained verified reusable images, templates, logs and evidence.')
