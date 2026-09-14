#!/usr/bin/env python3
"""Distribute one portable remediation rule; check content and agent entry points."""
import argparse
import configparser
import os
from pathlib import Path
import subprocess
import tempfile

APPS = ('business-suite-unified', 'crm7', 'conduit', 'braden', 'R80.4', 'throughput')
RULE = Path('.agents/rules/remediation-execution.md')
START = '<!-- bsuite-remediation-rules:start -->'
END = '<!-- bsuite-remediation-rules:end -->'


def entry(name):
    if name == 'CLAUDE.md':
        reference = '@.agents/rules/remediation-execution.md'
    else:
        reference = (
            'Read [.agents/rules/remediation-execution.md]'
            '(.agents/rules/remediation-execution.md) before remediation work.'
        )
    return (
        f'{START}\n## Remediation execution rules (2026-09-09)\n\n'
        f'{reference}\nThis current contract governs remediation execution where older '
        f'workflow defaults conflict.\n{END}\n\n'
    )


def configured_apps(root):
    path = root / '.gitmodules'
    if path.is_symlink() or not path.is_file():
        return (), [f'{path}: missing or symlinked submodule registry']
    parser = configparser.RawConfigParser()
    try:
        parser.read_string(path.read_text(encoding='utf-8'))
        paths = tuple(parser.get(section, 'path') for section in parser.sections())
    except (OSError, UnicodeError, configparser.Error) as exc:
        return (), [f'{path}: unreadable submodule registry: {exc}']
    if len(paths) != len(set(paths)) or set(paths) != set(APPS):
        expected = ', '.join(APPS)
        found = ', '.join(paths)
        return (), [f'{path}: expected exactly {expected}; found {found}']
    return APPS, []


def repo_error(repo):
    if repo.is_symlink() or not repo.is_dir():
        return f'{repo}: missing or symlinked repository checkout'
    dot_git = repo / '.git'
    if dot_git.is_symlink() or not (dot_git.is_file() or dot_git.is_dir()):
        return f'{repo}: uninitialised or non-repository checkout'
    try:
        result = subprocess.run(
            ('git', '-C', str(repo), 'rev-parse', '--show-toplevel'),
            check=False, capture_output=True, text=True,
        )
    except OSError as exc:
        return f'{repo}: cannot inspect repository checkout: {exc}'
    if result.returncode or Path(result.stdout.strip()).resolve() != repo.resolve():
        return f'{repo}: uninitialised or wrong repository checkout'
    return None


def output_error(repo, path, required=False):
    if path.is_symlink():
        return f'{path}: symlinked output is refused'
    if required and not path.is_file():
        return f'{path}: missing existing entry point; populate the checkout first'
    if path.exists() and not path.is_file():
        return f'{path}: output is not a regular file'
    parent = path.parent
    while parent != repo:
        if parent.is_symlink() or (parent.exists() and not parent.is_dir()):
            return f'{parent}: symlinked or non-directory output parent is refused'
        parent = parent.parent
    return None


def loader_output(path, name):
    try:
        text = path.read_text(encoding='utf-8')
    except (OSError, UnicodeError) as exc:
        return None, f'{path}: unreadable entry point: {exc}'
    starts, ends = text.count(START), text.count(END)
    if (starts, ends) not in ((0, 0), (1, 1)) or (
        starts == 1 and text.index(START) > text.index(END)
    ):
        return None, f'{path}: malformed or duplicate loader markers'
    if starts:
        before, rest = text.split(START, 1)
        _, after = rest.split(END, 1)
        text = before + after.lstrip('\n')
    output = entry(name) + text
    if (
        not output.startswith(entry(name))
        or output.count(START) != 1
        or output.count(END) != 1
    ):
        return None, f'{path}: generated loader failed validation'
    return output.encode('utf-8'), None


def sync(root, write=False):
    root = Path(root)
    apps, errors = configured_apps(root)
    if errors:
        return errors
    repos = (root, *(root / app for app in apps))
    for repo in repos:
        error = repo_error(repo)
        if error:
            errors.append(error)
    source_path = root / RULE
    error = output_error(root, source_path, required=True)
    if error:
        errors.append(error)
    if errors:
        return errors
    try:
        source = source_path.read_bytes()
    except OSError as exc:
        return [f'{source_path}: unreadable canonical rule: {exc}']

    # Build and validate the complete output plan before creating a directory or file.
    plan = []
    current = {}
    for repo in repos:
        target = repo / RULE
        error = output_error(repo, target, required=(repo == root))
        if error:
            errors.append(error)
        elif repo != root:
            try:
                current[target] = target.read_bytes() if target.exists() else None
            except OSError as exc:
                errors.append(f'{target}: unreadable rule output: {exc}')
            else:
                plan.append((repo, target, source))
        for name in ('AGENTS.md', 'CLAUDE.md'):
            path = repo / name
            error = output_error(repo, path, required=True)
            if error:
                errors.append(error)
                continue
            output, error = loader_output(path, name)
            if error:
                errors.append(error)
                continue
            try:
                current[path] = path.read_bytes()
            except OSError as exc:
                errors.append(f'{path}: unreadable entry point bytes: {exc}')
                continue
            plan.append((repo, path, output))
    if errors:
        return errors

    if not write:
        for _, path, desired in plan:
            if current[path] != desired:
                kind = (
                    'missing or divergent rule'
                    if path.name == RULE.name
                    else 'missing or divergent loader'
                )
                errors.append(f'{path}: {kind}')
        return errors

    created_dirs = []
    staged = []
    try:
        for repo, path, _ in plan:
            missing = []
            parent = path.parent
            while parent != repo and not parent.exists():
                missing.append(parent)
                parent = parent.parent
            for directory in reversed(missing):
                directory.mkdir()
                created_dirs.append(directory)
        # Stage every validated output before replacing any destination.
        for _, path, data in plan:
            mode = (path.stat().st_mode & 0o7777) if path.exists() else 0o644
            descriptor, temporary = tempfile.mkstemp(
                prefix=f'.{path.name}.', dir=path.parent
            )
            temporary = Path(temporary)
            try:
                with os.fdopen(descriptor, 'wb') as stream:
                    stream.write(data)
                    stream.flush()
                    os.fsync(stream.fileno())
                    os.fchmod(stream.fileno(), mode)
            except BaseException:
                temporary.unlink(missing_ok=True)
                raise
            staged.append((path, temporary))
        for path, temporary in staged:
            temporary.replace(path)
    except (OSError, UnicodeError) as exc:
        errors.append(f'write aborted: {exc}')
    finally:
        for _, temporary in staged:
            temporary.unlink(missing_ok=True)
        for directory in reversed(created_dirs):
            try:
                directory.rmdir()
            except OSError:
                pass
    if errors:
        return errors
    for _, path, desired in plan:
        if path.is_symlink() or path.read_bytes() != desired:
            errors.append(f'{path}: atomic write verification failed')
    return errors


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write', action='store_true')
    mode.add_argument('--check', action='store_true')
    args = parser.parse_args()
    failures = sync(Path(__file__).resolve().parents[1], args.write)
    message = '\n'.join(failures) if failures else (
        'PASS: 7 rule copies and 14 agent loaders'
    )
    print(message)
    raise SystemExit(bool(failures))
