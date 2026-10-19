# CODE releases

The current release source is `src/data/releases.json`, newest first. Its first version must match `package.json`, both root versions in `package-lock.json`, and a release tag `vX.Y.Z`. Stable semantic versions only. The release history is a sticky-header, scrollable page; its close control remains available with large text. The app and GitHub use the same descriptions; write concrete player-facing changes, not commit messages. Keep historical notes intact.

## Prepare a release

1. Run `npm version patch --no-git-tag-version` (or minor/major as appropriate). This changes package.json and package-lock.json, without committing/tagging.
2. Add the matching version at the beginning of `src/data/releases.json`: version, actual release date (`YYYY-MM-DD`), title and nonempty changes. Keep descriptions in English to match the current interface. Use the user's local release date, not the CI machine clock.
3. Update README's current revision and the implementation/QA handoff. Revisit quote revisions or storage schema only when their actual compatibility changes.
4. Run `npm test`, `npm run build`, and browser checks. Preview an upgrade on the same origin as the preceding build; changing a port creates a separate profile. Test the final move before update, undo history afterwards, offline reload, Back, update failure and both themes.
5. Review and commit the intended source, specs and workflow changes. Push the release commit to the branch connected to hosting. Create and push the matching annotated `vX.Y.Z` tag only when ready to publish. Never reuse a published tag.

`npm run release:check` checks versions/history; `RELEASE_TAG=vX.Y.Z npm run release:check` additionally checks the intended tag. `npm run release:notes` prints the exact description CI will publish. Neither command publishes anything.

## CI and publication

`.github/workflows/ci.yml` checks branch pushes and pull requests. `.github/workflows/release.yml` checks pushed version tags and publishes a GitHub release only after tests and build pass. The release includes `CODE-vX.Y.Z-web.zip` (contents of dist, ready to serve) and `SHA256SUMS.txt`. GitHub's normal GITHUB_TOKEN is used, with contents write only in the release job; no personal token or third-party release action is needed. Workflows are configuration until committed and pushed; remote CI has not been certified locally.

GitHub release publication and website deployment are separate. The host must serve the matching dist build at the **same HTTPS origin** as the installed PWA. Uploading a release archive to GitHub does not change an installed application. Do not force an update by clearing IndexedDB/cache, changing the app origin or unregistering the worker.

## Hosting

`vercel.json` prepares a Vite deployment matching the Shotcaller hosting convention. Connect this repository in Vercel, select the production branch and use the committed build/output settings. There is no production domain or project credential in this repository, and no deployment was initiated here. For another static host, use `npm ci`, `npm run build`, publish dist at the origin root and reproduce these headers:

| Resource | Cache-Control |
| --- | --- |
| `/`, `/index.html` | `no-cache, max-age=0, must-revalidate` |
| `/sw.js` | `no-store, max-age=0, must-revalidate` |
| `/manifest.webmanifest` | `no-cache, max-age=0, must-revalidate` |
| `/assets/*` (hashed files) | `public, max-age=31536000, immutable` |

Preserve old hashed assets briefly during deploys where the host allows it. Deploy the complete bundle atomically; never expose an HTML file whose referenced assets are not uploaded. Avoid permanently caching sw.js at an upstream CDN. Do not serve index.html in place of a missing script or service worker. Hash routing means `#/updates` needs no server rewrite and works from the offline cached document. Subpath hosting requires deliberate Vite base/manifest configuration; root hosting is the current contract.

## Runtime update contract

The worker is registered in prompt mode. `useAppUpdate` checks once registered, on visible return/online, and once per minute while visible/online. The installed version is always local metadata, never the as-yet-unloaded update's version. Failed checks never interrupt the puzzle or label an offline device up to date. Notes are bundled, without a GitHub/release API request.

The player opens Menu → What’s new, then Update & restart. `createUpdateAction` blocks duplicate requests and freezes input before flushing the latest IndexedDB queue. It waits for an installing worker and the actual waiting worker to activate before reloading once. Waits for worker state are bounded at 30 seconds and also polled to handle Android suspension/missed events. Save rejection or a stalled save (30 seconds) does not activate/reload; a late completion cannot trigger activation. Activation failure/timeout unlocks the UI for retry. Disposal aborts listeners/timers; activation in another tab never triggers an unsolicited reload. If another tab already activated it, the explicit action can reload into that version.

A requested update is already downloaded, so connectivity loss does not inherently prevent activation. Missing workers, discarded installs and messaging failures are recoverable. Existing storage schema/revision validation stays independent of app release versions. Cross-tab game-session synchronization remains outside this slice.

## Sources and reference

The interaction follows the local Shotcaller `UpdateToast.vue`, `usePwaUpdate.ts` and `application/pwaUpdate.ts`: periodic checks, explicit activation, bounded recovery and a separate patch-note view. CODE adds a mandatory local-write flush and keeps notifications behind its minimalist menu.

- [Vite PWA: periodic service-worker updates](https://vite-pwa-org.netlify.app/guide/periodic-sw-updates)
- [Vite PWA: prompt versus automatic reload](https://vite-pwa-org.netlify.app/guide/auto-update)
- [GitHub CLI: create release](https://cli.github.com/manual/gh_release_create)
- [GitHub: checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), [upload-artifact](https://github.com/actions/upload-artifact)
