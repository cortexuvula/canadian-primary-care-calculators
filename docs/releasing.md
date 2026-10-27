# Reproduce a preview release

This document describes building assets, **not permission to publish** or a claim of catalog approval. Keep releases prerelease/preview until native host behaviour has been evaluated. Do not distribute node_modules, test downloads, generated test logs or historical development archives.

1. Start from a clean checkout of the exact reviewed public commit. `public-files.json` is the explicit, sorted source/distribution allowlist; its entries must exactly equal the tracked files at HEAD. A new public file must be deliberately added to both the allowlist and Git.
2. Follow every command in [verification](verification.md). `npm run build` must preserve `runtime.sha256` and `git diff --exit-code` must remain empty.
3. Generate assets **outside** the checkout (requires Python 3 and Git, no Python packages):

   ```sh
   python3 scripts/release.py ../release-assets
   python3 scripts/release.py ../release-assets-repeat
   cmp ../release-assets/canadian-primary-care-0.3.0.zip ../release-assets-repeat/canadian-primary-care-0.3.0.zip
   (cd ../release-assets && sha256sum -c SHA256SUMS)
   ```

   macOS can verify SHA256SUMS with `shasum -a 256 -c SHA256SUMS` instead. The script refuses dirty tracked source, allowlist drift, non-regular files, runtime mismatch, and output inside the checkout.
4. Inspect `ASSET-MANIFEST.json`: it binds version, exact source commit, runtime SHA256, each source member's digest/size and ZIP digest/size. The ZIP contains one `canadian-primary-care/` directory with the reviewed source, MIT licence/notices, both identical runtime copies, and generated `RELEASE.json` binding the source commit. It uses sorted members, fixed timestamps/permissions and ZIP_STORED (no compression-library variability), so the same commit produces the same bytes across systems. No timestamp or local path is embedded.
5. Independently review source, all publishable history, screenshots and release hashes. The publication owner must verify required GitHub CI jobs pass at **that exact public commit**, then upload the ZIP, `ASSET-MANIFEST.json` and `SHA256SUMS` as prerelease assets and download/read them back to compare hashes. Local tests cannot establish remote CI status.
6. A proposed catalog entry must pin that exact 40-hex public commit, quote version `0.3.0`, use `tier: community`, category `desktop`, `requires_hermes: ">=0.21.6"`, no Python capabilities, and screenshot URLs pinned to that same public commit. Submission is not acceptance: only a Hermes maintainer can merge the catalog PR. Never advertise an unmerged listing as available.

For subsequent code changes, update source, tests and the reviewed runtime digest deliberately. A version change also requires updating manifest, package metadata, the release script/versioned filenames and corresponding tests/docs. Do not relabel an old runtime as a new clinical validation or assert regulatory classification.
