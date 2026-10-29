# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

-   `create-drive` no longer requires a new private drive's password to match the wallet's first private drive. Each private drive can have its own password, as the ArDrive desktop app does. `list-all-drives` with `-P` or `-p` still tries the one password on every drive and lists the drives it doesn't open as `ENCRYPTED`

### Fixed

-   Installing no longer prints deprecation warnings for `cids`, `interface-ipld-format`, `ipld-dag-pb`, `multibase`, `multicodec` and `stable`. `--add-ipfs-tag` now computes its CID with the current `ipfs-unixfs-importer` instead of the unmaintained `ipfs-only-hash`, and produces the same CIDs as before ([#368](https://github.com/ardriveapp/ardrive-cli/issues/368))

## [6.1.0] - 2026-10-28

### Updated

-   Updated to ardrive-core-js@5.1.0. A file's data now carries a `Unix-Time` tag (seconds), as its metadata always has and as the ArDrive web app's uploads already do, so indexes of uploads can date file data without reading its metadata. Each file data transaction or data item is 21 bytes larger; the upload planner counts the tag, so planned sizes and Turbo's free-upload limit match what is signed

## [6.0.0] - 2026-10-23

### Changed

-   **Requires Node.js 22.12 or later**, and is developed on Node 24 LTS (`.nvmrc`). Node 18 and 20 are end of life and receive no security fixes, and a fresh install on Node 18 fails with `ERR_REQUIRE_ESM` (current `uuid`, through `@ardrive/turbo-sdk`). A seed phrase gives the same wallet on Node 18, 22 and 24. CI tests 22 and 24
-   Published from GitHub Actions through npm trusted publishing, with provenance

### Fixed

-   `create-manifest`, `list-folder` and the other listing commands no longer fail on a drive whose snapshot carries empty metadata for a file (`Unexpected end of JSON input`). The file's metadata is fetched from the gateway instead ([#384](https://github.com/ardriveapp/ardrive-cli/issues/384))

### Updated

-   Updated to ardrive-core-js@5.0.0. Seed phrase wallets no longer depend on a package installed from git, so the CLI installs as a project dependency on npm 11. Wallets made from a seed phrase are unchanged: core-js checks 11 known wallets before every release

## [5.0.0] - 2026-10-21

### Changed

-   **Breaking:** `create-snapshot` publishes an ArFS Drive State entity (`Entity-Type: drive-state`): the drive's whole state as one SQLite database, which ArDrive clients read in one download. It no longer publishes JSON snapshots (`Entity-Type: snapshot`), which stay readable. Its JSON output names the result `txId` and adds `driveStateId`, `stateVersion`, `blockEnd`, `entityCount`, `plaintextBytes`, `sealedBytes`, `encrypted` and `transport`
-   `create-snapshot` supports private drives, with `--private` or `--drive-key`, and refuses a drive the wallet does not own. It says when a drive's privacy does not match the flags given, before reading the drive
-   `create-snapshot --dry-run` no longer requires the wallet to hold the estimated cost
-   `list-drive`, `list-folder`, `download-drive` and `download-folder` read a drive's snapshot first, through ardrive-core-js. `ARDRIVE_DISABLE_DRIVE_STATE=1` turns this off

### Added

-   `hide-file`, `unhide-file`, `hide-folder` and `unhide-folder`: hide an item from ArDrive's listings, or show it again, without deleting anything
-   `pin-file`: add an existing Arweave transaction to a public drive as a file, without uploading its data again
-   `snapshot-info`: whether a drive has a usable snapshot, and why not. With `--drive-key` it needs no wallet

### Updated

-   Updated to ardrive-core-js@4.5.0: snapshot reading is stricter and faster, and `create-snapshot` refuses to publish a snapshot every reader would refuse, or one with fewer entities than the drive's newest published snapshot (a gateway that has not indexed the whole drive)

## [4.0.0] - 2026-02-26

### Updated

-   Updated to ardrive-core-js@4.0.0
-   Changed remaining hardcoded arweave.net references to ardrive.net

## [3.1.0] - 2025-10-22

### Updated 

-   Updated to ardrive-core-js@3.1.0

## [3.0.5] - 2025-10-16

### Fixed

-   Fixed contentType handling to use logical OR operator instead of nullish coalescing to properly fallback to MIME type detection from file extension

## [3.0.4] - 2025-10-13

### Fixed

-   Correctly use seconds for Unix-Time Tag on ArFS Entities

## [3.0.3] - 2025-08-01

### Fixed

-   Fixes manifest lastModifiedDate timestamp to be milliseconds instead of seconds

## [3.0.2] - 2025-06-25

### Changed

-   Upload using turbo-sdk
-   Use @ardrive/ardrive-promise-cache over Core implementation
-   Updates several deps

## [3.0.1] - 2025-06-20

### Changed

- Updated ardrive-core-js dependency to version 3.0.1 to allow for empty App-Version tags

## [3.0.0] - 2025-06-16

### Added

-   Implemented support for ArFS v0.15 (Drive Privacy Updates)
