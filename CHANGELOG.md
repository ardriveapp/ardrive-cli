# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

-   **Breaking:** `create-snapshot` publishes an ArFS Drive State entity (`Entity-Type: drive-state`): the drive's whole state as one SQLite database, which ArDrive clients read in one download. It no longer publishes JSON snapshots (`Entity-Type: snapshot`), which stay readable. Its JSON output names the result `txId` and adds `driveStateId`, `stateVersion`, `blockEnd`, `entityCount`, `plaintextBytes`, `sealedBytes`, `encrypted` and `transport`
-   `create-snapshot` supports private drives, with `--private` or `--drive-key`, and refuses a drive the wallet does not own
-   `create-snapshot --dry-run` no longer requires the wallet to hold the estimated cost
-   `list-drive`, `list-folder`, `download-drive` and `download-folder` read a drive's snapshot first, through ardrive-core-js. `ARDRIVE_DISABLE_DRIVE_STATE=1` turns this off

### Added

-   `snapshot-info`: whether a drive has a usable snapshot, and why not

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
