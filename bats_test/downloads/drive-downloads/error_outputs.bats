#!/usr/bin/env bats

bats_require_minimum_version 1.5.0

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# File methods. DEPENDS on SUPPORT lib.
load '/home/node/packages/node_modules/bats-file/load.bash'
# Assertions.  DEPENDS on SUPPORT lib.
load '/home/node/packages/node_modules/bats-assert/load.bash'

# My custom function to trigger the download
load './download_drive.sh'

DIR="$(cd "$(dirname "${BATS_TEST_FILENAME}")" >/dev/null 2>&1 && pwd)"
# This folder ID came from this Drive ID "c0c8ba1c-efc5-420d-a07c-a755dc67f6b2"
MY_DRIVE_ID="dedace8e-9d10-455f-ac47-25336fd3117b"

@test "Errors out if the path is non-existent" {
    cd "${DIR}"
    run -1 download_public_drive "${MY_DRIVE_ID}" "/non/existent/path"

    assert_output "Error: ENOENT: no such file or directory, stat '/non/existent'"
}

@test "Errors out if the path exists as a non-folder" {
    cd "${DIR}"
    touch "${DIR}/existing_file.txt"
    run -1 download_public_drive "${MY_DRIVE_ID}" "${DIR}/existing_file.txt"

    assert_output "Error: The destination isn't a folder!"
}

@test 'Errors out if the drive ID is omitted' {
    cd "${DIR}"
    run download_public_drive

    # FIXME: it should return error code 1
    # [ "${status}" -eq 1 ]
    assert_output "error: required option '-d --drive-id <driveId>' not specified"
}

@test 'Errors out if the drive ID is invalid' {
    INVALID_DRIVE_ID="edace8e-9d10-455f-ac47-25336fd3117b"
    cd "${DIR}"
    run -1 download_public_drive "${INVALID_DRIVE_ID}"

    assert_output "Error: Invalid entity ID 'edace8e-9d10-455f-ac47-25336fd3117b'!'"
}

@test 'Errors out if the drive ID does not exist' {
    NON_EXISTANT_DRIVE_ID="00000000-0000-0000-0000-000000000000"
    cd "${DIR}"
    run -1 download_public_drive "${NON_EXISTANT_DRIVE_ID}"

    assert_output "Error: Could not find a transaction with \"Drive-Id\": ${NON_EXISTANT_DRIVE_ID}"
}

@test 'Downloading a private drive with no password' {
    PRIVATE_DRIVE_ID="b49b6c57-02e0-42ec-9777-90de70eda5f2"
    cd "${DIR}"
    run -1 download_private_drive "${PRIVATE_DRIVE_ID}"

    assert_output "Error: Neither a wallet file nor seed phrase was provided!"
}

@test 'Downloading a private drive with password and no wallet' {
    PRIVATE_DRIVE_ID="b49b6c57-02e0-42ec-9777-90de70eda5f2"
    LOCAL_PATH=""
    MAX_DEPTH=""
    UNSAFE_PASSWORD="contraseña"
    cd "${DIR}"
    run -1 download_private_drive "${PRIVATE_DRIVE_ID}" "${LOCAL_PATH}" "${MAX_DEPTH}" "${UNSAFE_PASSWORD}"

    assert_output "Error: Neither a wallet file nor seed phrase was provided!"
}

@test 'Downloading a private drive with drive key' {
    PRIVATE_DRIVE_ID="b49b6c57-02e0-42ec-9777-90de70eda5f2"
    LOCAL_PATH=""
    MAX_DEPTH=""
    UNSAFE_PASSWORD=""
    DRIVE_KEY="vzW8WUnr9KPGfisamJtAO2qMcy308it807hNpOhjgyg"
    cd "${DIR}"
    run download_private_drive "${PRIVATE_DRIVE_ID}" "${LOCAL_PATH}" "${MAX_DEPTH}" "${UNSAFE_PASSWORD}" "${DRIVE_KEY}"

    assert_output "Error: Neither a wallet file nor seed phrase was provided!"
}
