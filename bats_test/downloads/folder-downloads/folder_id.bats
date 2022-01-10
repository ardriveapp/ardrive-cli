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
MY_FOLDER_ID="abcdefghijklmnñopqrstuvwxyz"

teardown() {
    run bash "${DIR}/cleanup.sh"
}

@test 'Errors out if the folder ID is omitted' {
    cd "${DIR}"
    run download_folder

    # [ "${status}" -eq 1 ]
    [ "${output}" == "error: required option '-f --folder-id <folderId>' not specified" ]
}

@test 'Errors out if the folder ID is invalid' {
    cd "${DIR}"
    run download_folder "${MY_FOLDER_ID}"

    [ "${status}" -eq 1 ]
    [ "${output}" == "Error: Invalid entity ID 'abcdefghijklmnñopqrstuvwxyz'!'" ]
}
