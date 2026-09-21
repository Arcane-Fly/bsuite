import argparse
import json
import subprocess
import yaml

parser = argparse.ArgumentParser()
parser.add_argument('repo')
parser.add_argument('ref')
parser.add_argument('branch')
args = parser.parse_args()


def git(*command):
    return subprocess.check_output(['git', '-C', args.repo, *command], text=True).strip()


def branch_possible(config):
    if not isinstance(config, dict):
        return True
    if 'tags' in config and 'branches' not in config and 'branches-ignore' not in config:
        return False
    patterns = config.get('branches')
    if patterns is not None:
        if not isinstance(patterns, list):
            raise ValueError('branches must be a list')
        positive = [p for p in patterns if not p.startswith('!')]
        if all(not any(c in p for c in '*?[]+\\') for p in positive):
            return args.branch in positive
        return True
    ignored = config.get('branches-ignore', [])
    if not isinstance(ignored, list):
        raise ValueError('branches-ignore must be a list')
    if args.branch in ignored:
        return False
    return True


sha = git('rev-parse', args.ref)
paths = [p for p in git('ls-tree', '-r', '--name-only', sha, '.github/workflows').splitlines()
         if p.endswith(('.yml', '.yaml'))]
if not paths:
    raise RuntimeError('no workflow files found')
possible_push = []
other_event_consumers = []
for path in paths:
    source = git('show', f'{sha}:{path}')
    workflow = yaml.load(source, Loader=yaml.BaseLoader)
    if not isinstance(workflow, dict) or 'on' not in workflow:
        raise ValueError(f'{path}: missing workflow event mapping')
    events = workflow['on']
    if isinstance(events, str):
        events = {events: None}
    elif isinstance(events, list):
        events = {event: None for event in events}
    if not isinstance(events, dict):
        raise ValueError(f'{path}: invalid events')
    if 'push' in events and branch_possible(events['push']):
        possible_push.append({'path': path, 'name': workflow.get('name'), 'push': events['push']})
    for event in ('create', 'workflow_run', 'check_run', 'check_suite', 'status'):
        if event in events:
            other_event_consumers.append({'path': path, 'name': workflow.get('name'),
                                          'event': event, 'config': events[event]})
print(json.dumps({'source_sha': sha, 'branch': args.branch, 'workflow_files': len(paths),
                  'possible_push_workflows': possible_push,
                  'other_event_consumers_requiring_review': other_event_consumers,
                  'scope': 'Committed YAML only. Wildcard branch filters conservatively require review; path/job conditions are not used to suppress candidates. External integrations and scheduled jobs are not inferred.'}, indent=2))
