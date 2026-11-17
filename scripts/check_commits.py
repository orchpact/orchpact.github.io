"""Validate Conventional Commit subjects, locally and in CI."""
import argparse
from pathlib import Path
import re
import subprocess

SUBJECT = re.compile(r"(?:build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(?:\([a-z0-9][a-z0-9-]*\))?!?: \S.*")


def validate(message):
    subject = message.splitlines()[0] if message.splitlines() else ''
    if len(subject) > 72 or subject != subject.strip() or not SUBJECT.fullmatch(subject):
        raise ValueError('Use type(scope): description, at most 72 characters; scope is optional')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--message-file', type=Path)
    parser.add_argument('--base')
    parser.add_argument('--head', default='HEAD')
    parser.add_argument('--subject')
    args = parser.parse_args()
    try:
        if args.message_file:
            messages = [args.message_file.read_text()]
        elif args.subject is not None:
            messages = [args.subject]
        else:
            base_exists = bool(args.base and set(args.base) != {'0'})
            if base_exists:
                base_exists = subprocess.run(['git', 'cat-file', '-e', args.base + '^{commit}'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
            revision = args.base + '..' + args.head if base_exists else args.head
            # A newly published root or a rewritten branch may have no fetchable base.
            # Validate its complete reachable history instead of silently skipping it.
            command = ['git', 'log', '--format=%B%x00', '--no-merges']
            messages = [m.strip('\n') for m in subprocess.check_output(command + [revision], text=True).split('\x00') if m.strip()]
        for message in messages:validate(message)
        print(f'Validated {len(messages)} commit subject(s)')
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        parser.error(str(error))


if __name__ == '__main__':main()
