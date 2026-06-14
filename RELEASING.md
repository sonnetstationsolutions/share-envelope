# Releasing

This package publishes to npm via **trusted publishing (OIDC)** — no `NPM_TOKEN` secret. Tag pushes drive releases ([`.github/workflows/release.yml`](.github/workflows/release.yml)).

## One-time setup

OIDC cannot create a package, so the first publish is manual:

1. `npm login`, then from a clean checkout: `npm publish --access public` (builds via `prepare`).
2. On npmjs.com → the package → **Settings → Trusted Publisher**, add the GitHub repo `sonnetstationsolutions/share-envelope` and the `Release` workflow.
3. After that, never publish manually again — tags do it.

## Cutting a release

1. Update `CHANGELOG.md` (move items out of `Unreleased`, date the version).
2. Bump `version` in `package.json` (SemVer; a wire-format change to a fixed `ENVELOPE_VERSION` is breaking).
3. Commit, then tag and push:
   ```sh
   git tag v0.1.0
   git push origin main --tags
   ```
4. The `Release` workflow verifies the tag matches `package.json`, runs the build + tests, and publishes with provenance.

## Notes

- Tags can only be pushed by maintainers with write access, never by fork PRs — that is the publish gate.
- Trusted publishing needs npm >= 11.5.1; the workflow upgrades npm before publishing.
