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
MY_FOLDER_ID="dedace8e-9d10-455f-ac47-25336fd3117b"

teardown() {
    run bash "${DIR}/cleanup.sh"
}

@test 'The local path parameter defaults to the CWD when omitted' {
    cd "${DIR}"
    run download_folder "${MY_FOLDER_ID}"

    [ "${status}" -eq 0 ]

    assert_exist "${DIR}/CaSe"
    assert_exist "${DIR}/CaSe/100byts.txt"
    assert_exist "${DIR}/CaSe/100bYtS.txt"
}

@test "Downloads the folder into the specified path if it's a valid directory" {
    cd "${DIR}"
    run download_folder "${MY_FOLDER_ID}" "${DIR}"

    [ "${status}" -eq 0 ]

    assert_exist "${DIR}/CaSe"
    assert_exist "${DIR}/CaSe/100byts.txt"
    assert_exist "${DIR}/CaSe/100bYtS.txt"
}

@test "Downloads the folder into the dirname of the path if it's a non-existent item inside a valid directory" {
    cd "${DIR}"
    run download_folder "${MY_FOLDER_ID}" "${DIR}/MyCustomFolderName"

    [ "${status}" -eq 0 ]

    assert_exist "${DIR}/MyCustomFolderName"
    assert_exist "${DIR}/MyCustomFolderName/100byts.txt"
    assert_exist "${DIR}/MyCustomFolderName/100bYtS.txt"
}

@test "Errors out if the path is non-existent" {
    cd "${DIR}"
    run download_folder "${MY_FOLDER_ID}" "/non/existent/path"

    [ "${status}" -eq 1 ]
    [ "${output}" == "Error: ENOENT: no such file or directory, stat '/non/existent'" ]
}

@test "Errors out if the path exists as a non-file" {
    cd "${DIR}"
    mkfifo "${DIR}/some_fifo"
    run download_folder "${MY_FOLDER_ID}" "${DIR}/some_fifo"

    [ "${status}" -eq 1 ]
    [ "${output}" == "Error: The destination isn't a folder!" ]
}
