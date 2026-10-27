# Explicit SDK test-fixture setup

The plugin has no downloader or updater. `npm run sdk:verify`, the SDK browser
command, and the SDK harness only read/check files already provisioned under
ignored `.browser/sdk/`. They fail on missing/bad bytes; they never fetch or repair
them. The adapter browser suite does not require this optional fixture.

CI acquires the fixture in a separate, visible Python setup step in
`.github/workflows/ci.yml`, before the offline verifier and SDK suite. This is
networked **development setup only**, never installation/runtime code. The full
upstream commit and each file's SHA256 are pinned by `e2e/sdk-fixture.json`;
checksums are checked before writing any downloaded file. The upstream MIT
LICENSE is included in the fixture. These source files are not vendored or
included in the release ZIP; runtime SDK imports remain external.

## Local reproduction

From the repository root, after `npm ci`, explicitly run the same setup below
(Python 3, public HTTPS access, no credentials/private checkout). Review the pin
and checksum manifest first. For an offline machine, copy `.browser/sdk/` from a
trusted provisioned checkout, then run the same offline verification. Neither
path changes installed plugins or Hermes source.

```sh
python3 - <<'PY'
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

pin = "818c13be1dc4fd28987e1e881a9408224afd4535"
manifest = json.loads(Path("e2e/sdk-fixture.json").read_text())
assert manifest["sha"] == pin, "review the immutable SDK pin before changing it"
for name, expected in manifest["files"].items():
    path = Path(name)
    assert not path.is_absolute() and all(p not in ("", ".", "..") for p in name.split("/"))
    url = f"https://raw.githubusercontent.com/NousResearch/hermes-agent/{pin}/{name}"
    with urlopen(url, timeout=60) as response:
        data = response.read()
    if hashlib.sha256(data).hexdigest() != expected:
        raise ValueError("SDK checksum mismatch: " + name)
    target = Path(".browser/sdk") / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    print("Provisioned SDK " + name + " " + expected)
PY
npm run sdk:verify
npm run test:browser:sdk
```

A missing/checksum error is intentional: inspect the local fixture and repeat
this explicit setup (or restore from trusted offline media). Do not replace
checksums with local hashes merely to pass. Updating the upstream pin/checksums
requires deliberate review and both browser suites; it is not automatic tracking
of a branch or latest release. Network/package/browser downloads for development
are distinct from the plugin's offline/no-telemetry runtime guarantee.
