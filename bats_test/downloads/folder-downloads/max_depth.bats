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
MY_FOLDER_ID="e3e431bd-4bdb-4ef0-9245-9eec8e86b22f"

teardown() {
    run bash "${DIR}/cleanup.sh"
}

@test 'Max depth defaults to the maximum when omitted' {
    cd ${DIR}
    run download_folder "${MY_FOLDER_ID}"

    [ "${status}" -eq 0 ]

    assert_exist "${DIR}/Files With a Variety of Extensions Public"
    assert_exist "${DIR}/Files With a Variety of Extensions Public/CaSe"

    assert_exist "${DIR}/Files With a Variety of Extensions Public/1 space test.zip"
    assert_exist "${DIR}/Files With a Variety of Extensions Public/1234567890-asdfzxcvb1234567890-asdfzxcvb1234567890-asdfzxcvb1234567890-asdfzxcvb1234567890-asdfzxcvb.txt"
    assert_exist "${DIR}/Files With a Variety of Extensions Public/13"
    assert_exist "${DIR}/Files With a Variety of Extensions Public/arconnect-archive-team_-_ardrive.html"
    assert_exist "${DIR}/Files With a Variety of Extensions Public/Biochar-sample.pdf"
    assert_exist "${DIR}/Files With a Variety of Extensions Public/Coffee_chart.jpg"
    assert_exist "${DIR}/Files With a Variety of Extensions Public/samplee.mkv"

    assert_exist "${DIR}/Files With a Variety of Extensions Public/CaSe/100byts.txt"
    assert_exist "${DIR}/Files With a Variety of Extensions Public/CaSe/100bYtS.txt"
    # assert_exist "${DIR}/Files With a Variety of Extensions Public/test!_·$%d_%&·_.txt"
}

@test 'Custom Max depth value' {
    cd "${DIR}"
    run download_folder "${MY_FOLDER_ID}" "" "0" 

    [ "${status}" -eq 0 ]

    assert_exist "${DIR}/Files With a Variety of Extensions Public"
    assert_exist "${DIR}/Files With a Variety of Extensions Public/CaSe"

    assert_exist "${DIR}/Files With a Variety of Extensions Public/1 space test.zip"
    assert_exist "${DIR}/Files With a Variety of Extensions Public/1234567890-asdfzxcvb1234567890-asdfzxcvb1234567890-asdfzxcvb1234567890-asdfzxcvb1234567890-asdfzxcvb.txt"
    assert_exist "${DIR}/Files With a Variety of Extensions Public/13"
    assert_exist "${DIR}/Files With a Variety of Extensions Public/arconnect-archive-team_-_ardrive.html"
    assert_exist "${DIR}/Files With a Variety of Extensions Public/Biochar-sample.pdf"
    assert_exist "${DIR}/Files With a Variety of Extensions Public/Coffee_chart.jpg"
    assert_exist "${DIR}/Files With a Variety of Extensions Public/samplee.mkv"
    # assert_exist "${DIR}/Files With a Variety of Extensions Public/test!_·$%d_%&·_.txt"

    [ ! -f "${DIR}/Files With a Variety of Extensions Public/CaSe/100byts.txt" ]
    [ ! -f "${DIR}/Files With a Variety of Extensions Public/CaSe/100bYtS.txt" ]
}