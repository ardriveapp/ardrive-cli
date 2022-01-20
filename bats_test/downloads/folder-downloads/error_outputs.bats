#!/usr/bin/env bats

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# File methods. DEPENDS on SUPPORT lib.
load '/home/node/packages/node_modules/bats-file/load.bash'
# Assertions.  DEPENDS on SUPPORT lib.
load '/home/node/packages/node_modules/bats-assert/load.bash'

# My custom function to trigger the download
load './download_folder.sh'

DIR="$(cd "$(dirname "${BATS_TEST_FILENAME}")" >/dev/null 2>&1 && pwd)"
# This folder ID came from this Drive ID "c0c8ba1c-efc5-420d-a07c-a755dc67f6b2"
MY_FOLDER_ID="dedace8e-9d10-455f-ac47-25336fd3117b"

@test "Errors out if the path is non-existent" {
    cd "${DIR}"
    run -1 download_folder "${MY_FOLDER_ID}" "/non/existent/path"

    assert_output "Error: ENOENT: no such file or directory, stat '/non/existent'"
}

@test "Errors out if the path exists as a non-folder" {
    cd "${DIR}"
    touch "${DIR}/existing_file.txt"
    run -1 download_folder "${MY_FOLDER_ID}" "${DIR}/existing_file.txt"

    assert_output "Error: The destination isn't a folder!"
}

@test 'Errors out if the folder ID is omitted' {
    cd "${DIR}"
    run download_folder

    # FIXME: it should return error code 1
    # [ "${status}" -eq 1 ]
    assert_output "error: required option '-f --folder-id <folderId>' not specified"
}

@test 'Errors out if the folder ID is invalid' {
    INVALID_FOLDER_ID="edace8e-9d10-455f-ac47-25336fd3117b"
    cd "${DIR}"
    run -1 download_folder "${INVALID_FOLDER_ID}"

    assert_output "Error: Invalid entity ID 'edace8e-9d10-455f-ac47-25336fd3117b'!'"
}

@test 'Errors out if the folder ID does not exist' {
    NON_EXISTANT_FOLDER_ID="00000000-0000-0000-0000-000000000000"
    cd "${DIR}"
    run -1 download_folder "${NON_EXISTANT_FOLDER_ID}"

    assert_output "Error: Entity with Folder-Id ${NON_EXISTANT_FOLDER_ID} not found!"
}
