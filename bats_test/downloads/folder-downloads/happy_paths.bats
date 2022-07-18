#!/usr/bin/env bats

bats_require_minimum_version 1.5.0

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
MY_FOLDER_ID="e3e431bd-4bdb-4ef0-9245-9eec8e86b22f"

setup() {
    run bash "${DIR}/cleanup.sh"
}

@test 'Max depth defaults to the maximum when omitted' {
    FOLDER_ID_WITH_LARGE_DEPTH="bb48af83-191c-4e7a-8cef-260430b10d83"
    cd "${DIR}"
    run download_folder "${FOLDER_ID_WITH_LARGE_DEPTH}" "${DIR}"

    # The root of the sub-tree
    assert_dir_exist "${DIR}/upMe"

    # Bundled item
    assert_file_exist "${DIR}/upMe/bundled/bund1/bund2/bund3/bund4/1234567890-asdfzxcvb1234567890-asdfzxcvb1234567890-asdfzxcvb1234567890-asdfzxcvb1234567890-asdfzxcvb.txt"

    # Non bundled item
    assert_file_exist "${DIR}/upMe/upMe/215432^#!%3241@^SDa (1)/test-lvl1-file.txt"

    # A folder
    assert_dir_exist "${DIR}/upMe/upMe/215432^#!%3241@^SDa (1)/215432^#!%3241@^SDa/22"
}

@test 'Custom Max depth value of zero' {
    cd "${DIR}"
    run -0 download_folder "${MY_FOLDER_ID}" "" "0" 

    assert_dir_exist "${DIR}/Files With a Variety of Extensions Public"
    assert_dir_exist "${DIR}/Files With a Variety of Extensions Public/CaSe"

    assert_file_exist "${DIR}/Files With a Variety of Extensions Public/1 space test.zip"
    assert_file_exist "${DIR}/Files With a Variety of Extensions Public/1234567890-asdfzxcvb1234567890-asdfzxcvb1234567890-asdfzxcvb1234567890-asdfzxcvb1234567890-asdfzxcvb.txt"
    assert_file_exist "${DIR}/Files With a Variety of Extensions Public/13"
    assert_file_exist "${DIR}/Files With a Variety of Extensions Public/arconnect-archive-team_-_ardrive.html"
    assert_file_exist "${DIR}/Files With a Variety of Extensions Public/Biochar-sample.pdf"
    assert_file_exist "${DIR}/Files With a Variety of Extensions Public/Coffee_chart.jpg"
    assert_file_exist "${DIR}/Files With a Variety of Extensions Public/samplee.mkv"

    # Skipped to avoid the wrong path error
    # assert_file_exist "${DIR}/Files With a Variety of Extensions Public/test!_·$%d_%&·_.txt"

    assert_file_not_exist "${DIR}/Files With a Variety of Extensions Public/CaSe/100byts.txt"
    assert_file_not_exist "${DIR}/Files With a Variety of Extensions Public/CaSe/100bYtS.txt"
}

@test "Downloads the folder into the dirname of the path if it's a non-existent item inside a valid directory" {
    SMALL_FOLDER_ID="dedace8e-9d10-455f-ac47-25336fd3117b"
    cd "${DIR}"
    run -0 download_folder "${SMALL_FOLDER_ID}" "${DIR}/MyCustomFolderName"

    assert_exist "${DIR}/MyCustomFolderName"
    assert_exist "${DIR}/MyCustomFolderName/100byts.txt"
    assert_exist "${DIR}/MyCustomFolderName/100bYtS.txt"
}
