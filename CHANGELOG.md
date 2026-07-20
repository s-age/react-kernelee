# Changelog

All notable changes to this project are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [0.3.0] - 2026-07-20

### Changed
- **Breaking:** `useDispatch`'s symbol form now type-rejects void-payload commands instead of silently forwarding whatever argument it's called with. Use the new `useTrigger()` hook to bind a void command.
- `@s-age/kernelee` devDependency pinned to `^0.5.0` (registry, no longer file:-linked).

### Added
- Documented the app-level recipe for clearing `KernelErrorState`.

### Fixed
- Non-scoped import name in the README usage example.
