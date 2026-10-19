import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root = new URL('../', import.meta.url)
const read = (name) => JSON.parse(readFileSync(new URL(name, root), 'utf8'))
export function validateRelease(catalog, packageVersion, lockVersion, tag) {
  if (!Array.isArray(catalog) || !catalog.length) throw new Error('Release notes are empty')
  const versions = new Set()
  let previous
  for (const release of catalog) {
    if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(release.version)) throw new Error('Use stable major.minor.patch versions')
    if (versions.has(release.version)) throw new Error('Duplicate release version')
    const parts = release.version.split('.').map(Number)
    if (previous) {
      const different = parts.findIndex((part, i) => part !== previous[i])
      if (different === -1 || parts[different] >= previous[different]) throw new Error('Releases must be newest first')
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(release.date) || !Number.isFinite(Date.parse(release.date)) || new Date(release.date).toISOString().slice(0,10) !== release.date) throw new Error('Invalid release date')
    if (typeof release.title !== 'string' || !release.title.trim() || !Array.isArray(release.changes) || !release.changes.length || release.changes.some(change => typeof change !== 'string' || !change.trim())) throw new Error('Each release needs a title and actual changes')
    versions.add(release.version); previous = parts
  }
  const current = catalog[0]
  if (current.version !== packageVersion || current.version !== lockVersion) throw new Error('package.json, package-lock.json and latest release must agree')
  if (tag && tag !== `v${current.version}`) throw new Error('Release tag does not match this build')
  return current
}
export function releaseMarkdown(release) {
  return `# CODE ${release.version} — ${release.title}\n\n${release.date}\n\n${release.changes.map(change => `- ${change}`).join('\n')}\n\nThe PWA downloads updates in the background. Open Menu → What’s new → Update & restart when you’re ready. Progress stays on this device.\n`
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const pkg = read('package.json'), lock = read('package-lock.json')
    if (lock.packages?.['']?.version !== pkg.version) throw new Error('Lockfile root version mismatch')
    const release = validateRelease(read('src/data/releases.json'), pkg.version, lock.version, process.env.RELEASE_TAG)
    if (process.argv[2] === 'notes') process.stdout.write(releaseMarkdown(release))
    else console.log(`Release v${release.version}: version, notes and tag are consistent.`)
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
