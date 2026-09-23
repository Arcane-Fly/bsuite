#!/usr/bin/env bash
set -euo pipefail

root=/home/braden/Desktop/Dev/bsuite/.devin/ci-runner
tooling="$root/tooling"
proxy_name=bsuite-ci-egress-tooling-20260920
base="$root/ubuntu-24.04-server-cloudimg-amd64.img"
overlay="$tooling/tooling.qcow2"
seed="$tooling/seed-tooling.img"
serial="$tooling/boot-tooling.log"
qemu_status="$tooling/qemu-exit.status"
proxy_id="$tooling/proxy-container.id"
proxy_container_id=''

cleanup() {
  [ -n "$proxy_container_id" ] || return 0
  docker stop --time 10 "$proxy_container_id" >/dev/null 2>&1 || true
  docker rm "$proxy_container_id" >/dev/null 2>&1 || true
}
trap cleanup EXIT

test -d "$tooling"
test ! -e "$overlay"
test ! -e "$seed"
test ! -e "$serial"
test "$(docker image inspect bsuite-ci-egress:local --format '{{.Id}}')" = sha256:a9a73d18a51aada57dc535452f67e514f473eb4e2847c0927316e49243c97d93

qemu-img create -f qcow2 -F qcow2 -b "$base" "$overlay" 32G
cloud-localds --network-config="$tooling/network-config" "$seed" "$tooling/user-data" "$tooling/meta-data"

proxy_container_id=$(docker run -d \
  --name "$proxy_name" \
  --user proxy \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --read-only \
  --tmpfs /tmp:rw,nosuid,noexec,size=16m \
  --memory 128m \
  --cpus 0.5 \
  --pids-limit 64 \
  --network host \
  --mount type=bind,src="$root/proxy/ci-egress.conf",dst=/etc/squid/ci-egress.conf,readonly \
  bsuite-ci-egress:local)
printf '%s\n' "$proxy_container_id" > "$proxy_id"

set +e
timeout --signal=TERM --kill-after=10s 1200 \
  qemu-system-x86_64 \
  -name bsuite-ci-tooling-20260920 \
  -machine q35,accel=kvm,usb=off \
  -cpu host \
  -smp 4 \
  -m 8192 \
  -drive file="$overlay",if=virtio,format=qcow2 \
  -drive file="$seed",if=virtio,format=raw,readonly=on \
  -netdev 'user,id=net0,restrict=on,ipv6=off,guestfwd=tcp:10.0.2.100:3128-cmd:nc 127.0.0.1 43128' \
  -device 'virtio-net-pci,netdev=net0,mac=52:54:00:26:09:20' \
  -display none \
  -vga none \
  -monitor none \
  -serial file:"$serial" \
  -no-reboot
rc=$?
set -e
printf '%s\n' "$rc" > "$qemu_status"
exit "$rc"
