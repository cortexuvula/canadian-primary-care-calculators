"""Build a deterministic, allowlisted source + desktop plugin ZIP from clean HEAD.

No network, publishing, installation or external packages. Output must be outside
this checkout so source admission scans never ingest an archive of themselves.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import zipfile


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    root = Path.cwd().resolve()
    if len(sys.argv) != 2:
        raise ValueError('usage: python3 scripts/release.py OUTPUT_DIRECTORY (outside checkout)')
    output = Path(sys.argv[1]).resolve()
    if output == root or root in output.parents:
        raise ValueError('release output must be outside the source checkout')

    def git(*args):
        return subprocess.check_output(['git', *args], cwd=root)

    if git('status', '--porcelain', '--untracked-files=no').strip():
        raise ValueError('release requires a clean committed source tree')
    sha = git('rev-parse', 'HEAD').decode().strip()
    files = json.loads((root / 'public-files.json').read_text())
    tracked = git('ls-tree', '-r', '--name-only', 'HEAD').decode().splitlines()
    if files != sorted(set(files)) or tracked != files:
        raise ValueError('tracked tree must exactly match sorted public-files.json allowlist')
    for name in files:
        p = Path(name)
        if p.is_absolute() or '..' in p.parts or name.startswith(('.browser/', '.artifacts/', 'node_modules/', 'docs/evidence/')):
            raise ValueError('unsafe path in release allowlist: ' + name)
        if not (root / name).is_file() or (root / name).is_symlink():
            raise ValueError('release files must be regular files: ' + name)
    contents = {name: git('show', f'{sha}:{name}') for name in files}
    version = json.loads(contents['package.json'])['version']
    if version != '0.3.0':
        raise ValueError('review release version before changing the release script')
    expected = contents['runtime.sha256'].decode().strip()
    if contents['plugin.js'] != contents['desktop/plugin.js'] or digest(contents['plugin.js']) != expected:
        raise ValueError('root/desktop runtime must match reviewed runtime.sha256')
    metadata = {
        'version': version,
        'status': 'preview-prerelease',
        'source_sha': sha,
        'runtime_sha256': expected,
        'files': {name: {'sha256': digest(data), 'bytes': len(data)} for name, data in contents.items()},
    }
    encode = lambda value: (json.dumps(value, indent=2, sort_keys=True) + '\n').encode()
    contents['RELEASE.json'] = encode(metadata)
    output.mkdir(parents=True, exist_ok=True)
    asset = output / f'canadian-primary-care-{version}.zip'
    with zipfile.ZipFile(asset, 'w', compression=zipfile.ZIP_STORED) as archive:
        for name, data in sorted(contents.items()):
            info = zipfile.ZipInfo('canadian-primary-care/' + name, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)
    metadata['assets'] = {asset.name: {'sha256': digest(asset.read_bytes()), 'bytes': asset.stat().st_size}}
    manifest = output / 'ASSET-MANIFEST.json'
    manifest.write_bytes(encode(metadata))
    (output / 'SHA256SUMS').write_text(''.join(
        f'{digest(path.read_bytes())}  {path.name}\n' for path in (asset, manifest)
    ))
    print(f'Built {asset.name} from {sha}; runtime {expected}')
    print((output / 'SHA256SUMS').read_text(), end='')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f'Release refused: {error}', file=sys.stderr)
        sys.exit(1)
