# Hermes compatibility

`requires_hermes: ">=0.21.6"` is a supported API floor, not a calendar version or a claim of live-host certification. Hermes Desktop is required independently of the CLI version.

The oldest published SemVer release in the checked release series is [v0.21.6](https://github.com/NousResearch/hermes-agent/releases/tag/v0.21.6), commit `818c13be1dc4fd28987e1e881a9408224afd4535`. At that immutable public commit:

- [`sdk/index.ts`](https://github.com/NousResearch/hermes-agent/blob/818c13be1dc4fd28987e1e881a9408224afd4535/apps/desktop/src/sdk/index.ts) exports Button, Input, host.navigate, ROUTES_AREA, SIDEBAR_NAV_AREA and PALETTE_AREA.
- [`contrib/plugin.ts`](https://github.com/NousResearch/hermes-agent/blob/818c13be1dc4fd28987e1e881a9408224afd4535/apps/desktop/src/contrib/plugin.ts) defines register(ctx), defaultEnabled:false, synchronous scoped storage.get/set and `ctx.os.writeClipboard(text): Promise<boolean>`.
- The plugin uses only these SDK exports/contracts plus React hooks and standard browser APIs scoped to its own rendered component. Route `/canadian-primary-care`, plugin ID `canadian-primary-care`, sidebar order 63 and `favourites.v1` storage key are unchanged.
- `e2e/sdk-fixture.json` pins the Button/Input implementation and dependencies by upstream commit and individual SHA256. `npm run test:browser:sdk` tests those controls with the real compiled plugin.

The same contract symbols were also checked at published v0.21.7, v0.22.0 and v0.22.5. Local admission validation uses v0.22.5; CI pins that validator release separately. We do not claim v0.21.6 introduced all these APIs, or that every older version is incompatible; versions below the declared floor are unsupported. Manifest and proposed catalog metadata share the same floor.

Browser tests do not launch Desktop/Electron or its plugin loader, and do not exercise complete host CSS or the OS clipboard. Treat live-host behaviour and native OS/platform compatibility as unverified for this preview. No platform-specific live certification is claimed.
