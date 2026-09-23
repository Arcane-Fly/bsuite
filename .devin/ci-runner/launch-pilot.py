import copy
import json
import os
from pathlib import Path
import signal
import socket
import stat
import subprocess
import sys
import tempfile
import yaml

ROOT = Path('/home/braden/Desktop/Dev/bsuite/.devin/ci-runner')
LABEL = 'bsuite-local-pilot-20260920'
PREFIX = 'bsuite-vm-pilot-20260920-'
IMAGE = 'sha256:a9a73d18a51aada57dc535452f67e514f473eb4e2847c0927316e49243c97d93'
BOOTSTRAP = '''#!/usr/bin/env bash
set -euo pipefail
export http_proxy=http://10.0.2.100:3128 https_proxy=http://10.0.2.100:3128 HTTP_PROXY=http://10.0.2.100:3128 HTTPS_PROXY=http://10.0.2.100:3128 no_proxy=localhost,127.0.0.1 NO_PROXY=localhost,127.0.0.1
cd /opt/actions-runner
jit_config=$(< .jit-config)
rm -f .jit-config
printf 'BSUITE_PILOT_STARTING_JIT\\n'
timeout --signal=TERM --kill-after=10s 1800 ./run.sh --jitconfig "$jit_config"
unset jit_config
printf 'BSUITE_PILOT_LISTENER_FINISHED\\n'
'''


def validate(response):
    if not isinstance(response, dict) or not isinstance(response.get('encoded_jit_config'), str) or not response['encoded_jit_config']:
        raise ValueError('Missing one-use JIT configuration')
    runner = response.get('runner', {})
    name = runner.get('name', '')
    suffix = name.removeprefix(PREFIX) if isinstance(name, str) else ''
    if not isinstance(name, str) or not name.startswith(PREFIX) or len(suffix) != 8 or any(c not in '0123456789abcdef' for c in suffix):
        raise ValueError('Unexpected runner name')
    if type(runner.get('id')) is not int or runner['id'] <= 0:
        raise ValueError('Invalid runner identity')
    if runner.get('ephemeral', True) is not True:
        raise ValueError('JIT runner explicitly reported non-ephemeral')
    labels = runner.get('labels')
    if not isinstance(labels, list) or any(not isinstance(x, dict) or not isinstance(x.get('name'), str) for x in labels):
        raise ValueError('Invalid runner label metadata')
    names = {x['name'].lower() for x in labels}
    if LABEL not in names or not names.issubset({LABEL, 'self-hosted', 'linux', 'x64'}):
        raise ValueError('Unexpected runner routing labels')
    return {'runner_id': runner['id'], 'runner_name': name, 'labels': sorted(names), 'repository': 'GaryOcean428/bsuite', 'ephemeral_contract': 'GitHub generate-jitconfig single-job API'}


def cloud_config(encoded):
    return {
        'hostname': 'bsuite-ci-pilot', 'ssh_pwauth': False, 'disable_root': True,
        'package_update': False, 'package_upgrade': False,
        'write_files': [
            {'path': '/opt/actions-runner/.jit-config', 'owner': 'ci:ci', 'permissions': '0600', 'content': encoded},
            {'path': '/opt/actions-runner/start-pilot.sh', 'owner': 'ci:ci', 'permissions': '0700', 'content': BOOTSTRAP},
        ],
        'runcmd': [['bash', '-euo', 'pipefail', '-c', 'exec > >(tee /dev/ttyS0) 2>&1; runuser -u ci -- /opt/actions-runner/start-pilot.sh']],
        'power_state': {'delay': 'now', 'mode': 'poweroff', 'timeout': 60, 'condition': True},
    }


def proxy_args(name):
    return ['docker', 'run', '-d', '--pull=never', '--name', name, '--user', 'proxy',
            '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--read-only',
            '--tmpfs', '/tmp:rw,nosuid,noexec,size=16m', '--memory', '128m', '--cpus', '0.5',
            '--pids-limit', '64', '--network', 'host', '--mount',
            f'type=bind,src={ROOT}/proxy/ci-egress.conf,dst=/etc/squid/ci-egress.conf,readonly', IMAGE]


def qemu_args(name, disk, seed, serial):
    return ['timeout', '--signal=TERM', '--kill-after=10s', '2400', 'qemu-system-x86_64',
            '-name', name, '-machine', 'q35,accel=kvm,usb=off', '-cpu', 'host', '-smp', '4', '-m', '8192',
            '-drive', f'file={disk},if=virtio,format=qcow2',
            '-drive', f'file={seed},if=virtio,format=raw,readonly=on',
            '-netdev', 'user,id=net0,restrict=on,ipv6=off,guestfwd=tcp:10.0.2.100:3128-cmd:nc 127.0.0.1 43128',
            '-device', 'virtio-net-pci,netdev=net0,mac=52:54:00:26:09:20',
            '-display', 'none', '-vga', 'none', '-monitor', 'none', '-serial', f'file:{serial}', '-no-reboot']


def save_state(path, state):
    path.write_text(json.dumps(state, indent=2) + '\n')
    print(json.dumps(state), flush=True)


def run():
    os.umask(0o077)
    response = json.load(sys.stdin)
    state = validate(response)
    suffix = state['runner_name'][-8:]
    state_path = ROOT / f'pilot-state-{suffix}.json'
    disk = ROOT / f'pilot-job-{suffix}.qcow2'
    if state_path.exists() or disk.exists():
        raise ValueError('Refusing to overwrite existing pilot artifacts')
    runtime_root = Path(f'/run/user/{os.getuid()}')
    info = runtime_root.stat()
    if info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) & 0o077:
        raise ValueError('Private runtime root is not private to this user')
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1', 43128)) == 0:
            raise ValueError('Proxy port is already occupied; refusing to replace its owner')
    private = Path(tempfile.mkdtemp(prefix=f'devin-bsuite-pilot-{suffix}-', dir=runtime_root))
    state.update({'state': 'preparing', 'private_runtime': str(private), 'disk': str(disk), 'one_job_only': True})
    save_state(state_path, state)
    (private / 'user-data').write_text('#cloud-config\n' + yaml.safe_dump(cloud_config(response['encoded_jit_config']), sort_keys=False))
    (private / 'meta-data').write_text(yaml.safe_dump({'instance-id': state['runner_name'], 'local-hostname': 'bsuite-ci-pilot'}))
    (private / 'network-config').write_text(yaml.safe_dump({'version': 2, 'ethernets': {'ci': {'match': {'macaddress': '52:54:00:26:09:20'}, 'dhcp4': True}}}))
    seed = private / 'seed.img'
    serial = private / 'console.log'
    cid = None
    process = None
    try:
        subprocess.run(['qemu-img', 'create', '-f', 'qcow2', '-F', 'qcow2', '-b', str(ROOT / 'tooling/tooling.qcow2'), str(disk), '32G'], check=True)
        subprocess.run(['cloud-localds', f'--network-config={private}/network-config', str(seed), str(private / 'user-data'), str(private / 'meta-data')], check=True)
        cid = subprocess.check_output(proxy_args(f'bsuite-ci-egress-pilot-{suffix}'), text=True).strip()
        if len(cid) != 64 or any(c not in '0123456789abcdef' for c in cid):
            cid = None
            raise RuntimeError('Docker returned an invalid owned container ID')
        process = subprocess.Popen(qemu_args(state['runner_name'], disk, seed, serial), start_new_session=True)
        state.update({'state': 'vm_running', 'qemu_wrapper_pid': process.pid})
        save_state(state_path, state)
        code = process.wait()
        text = serial.read_text(errors='replace') if serial.exists() else ''
        state.update({'state': 'vm_stopped', 'qemu_exit': code,
                      'jit_start_marker': 'BSUITE_PILOT_STARTING_JIT' in text,
                      'listener_finished_marker': 'BSUITE_PILOT_LISTENER_FINISHED' in text,
                      'job_result': 'Must inspect authoritative GitHub job result; VM exit is not acceptance'})
        save_state(state_path, state)
    finally:
        if process is not None and process.poll() is None:
            os.killpg(process.pid, signal.SIGTERM)
            try:
                process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait()
        if cid:
            stopped = subprocess.run(['docker', 'stop', '--time', '10', cid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            removed = subprocess.run(['docker', 'rm', cid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            state.update({'proxy_stop_exit': stopped.returncode, 'proxy_remove_exit': removed.returncode, 'proxy_cleanup_confirmed': removed.returncode == 0})
        else:
            state['proxy_cleanup_confirmed'] = False
        state['private_artifacts_retained_for_lead_disposal'] = True
        save_state(state_path, state)


def self_test():
    sample = {'encoded_jit_config': 'fake-one-use-config', 'runner': {'id': 1, 'name': PREFIX + '1234abcd', 'ephemeral': True, 'labels': [{'name': LABEL}]}}
    safe = validate(sample)
    assert sample['encoded_jit_config'] not in json.dumps(safe)
    failures = [None, {}, {'encoded_jit_config': ''}]
    for field, value in [('id', 0), ('id', True), ('name', 'other'), ('ephemeral', False), ('labels', []), ('labels', [{'name': LABEL}, {'name': 'ubuntu-latest'}])]:
        bad = copy.deepcopy(sample)
        bad['runner'][field] = value
        failures.append(bad)
    for bad in failures:
        try:
            validate(bad)
        except (ValueError, TypeError):
            pass
        else:
            raise AssertionError('Malformed response accepted')
    cfg = cloud_config(sample['encoded_jit_config'])
    assert len(cfg['runcmd']) == 1 and cfg['runcmd'][0][:4] == ['bash', '-euo', 'pipefail', '-c']
    assert [x['permissions'] for x in cfg['write_files']] == ['0600', '0700']
    assert 'config.sh' not in BOOTSTRAP and '--jitconfig "$jit_config"' in BOOTSTRAP
    assert sample['encoded_jit_config'] not in BOOTSTRAP
    assert yaml.safe_load(yaml.safe_dump(cfg)) == cfg
    args = qemu_args('test', '/disk', '/seed', '/serial')
    assert args[args.index('-smp') + 1] == '4' and args[args.index('-m') + 1] == '8192'
    assert 'restrict=on' in args[args.index('-netdev') + 1]
    assert not any(x in ' '.join(args) for x in ('hostfwd', 'virtfs', 'fsdev'))
    proxy = proxy_args('test')
    assert '--read-only' in proxy and proxy[proxy.index('--cap-drop') + 1] == 'ALL'
    assert proxy[proxy.index('--user') + 1] == 'proxy' and '--pull=never' in proxy
    subprocess.run(['bash', '-n'], input=BOOTSTRAP, text=True, check=True)
    print(f'PASS: valid JIT metadata, {len(failures)} rejected inputs, private cloud config, Bash syntax, VM and proxy boundaries; no live operations')


if __name__ == '__main__':
    if sys.argv[1:] == ['--self-test']:
        self_test()
    elif sys.argv[1:] == ['--run']:
        try:
            run()
        except Exception as error:
            print(f'Pilot setup stopped: {type(error).__name__}; inspect nonsecret state and private diagnostics', file=sys.stderr)
            raise SystemExit(1)
    else:
        raise SystemExit('Use --self-test or --run with JIT response on stdin')
