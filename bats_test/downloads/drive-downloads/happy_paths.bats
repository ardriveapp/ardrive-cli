#!/usr/bin/env bats

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# File methods. DEPENDS on SUPPORT lib.
load '/home/node/packages/node_modules/bats-file/load.bash'
# Assertions.  DEPENDS on SUPPORT lib.
load '/home/node/packages/node_modules/bats-assert/load.bash'

# My custom function to trigger the download
load './download_drive.sh'

DIR="$(cd "$(dirname "${BATS_TEST_FILENAME}")" >/dev/null 2>&1 && pwd)"
MY_DRIVE_ID="c0c8ba1c-efc5-420d-a07c-a755dc67f6b2"

setup() {
    run bash "${DIR}/cleanup.sh"
}

@test 'Max depth defaults to the maximum when omitted' {
    cd "${DIR}"
    run -0 download_drive "${MY_DRIVE_ID}" "${DIR}"

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

    assert_file_exist "${DIR}/Files With a Variety of Extensions Public/CaSe/100byts.txt"
    assert_file_exist "${DIR}/Files With a Variety of Extensions Public/CaSe/100bYtS.txt"

}

# this test is already covered by the one below
# @test 'Custom Max depth value of zero' {
#     cd "${DIR}"
#     run -0 download_drive "${MY_DRIVE_ID}" "" "0"

#     assert_dir_exist "${DIR}/Files With a Variety of Extensions Public"
#     assert_dir_exist "${DIR}/Files With a Variety of Extensions Public/CaSe"

#     assert_file_exist "${DIR}/Files With a Variety of Extensions Public/1 space test.zip"
#     assert_file_exist "${DIR}/Files With a Variety of Extensions Public/1234567890-asdfzxcvb1234567890-asdfzxcvb1234567890-asdfzxcvb1234567890-asdfzxcvb1234567890-asdfzxcvb.txt"
#     assert_file_exist "${DIR}/Files With a Variety of Extensions Public/13"
#     assert_file_exist "${DIR}/Files With a Variety of Extensions Public/arconnect-archive-team_-_ardrive.html"
#     assert_file_exist "${DIR}/Files With a Variety of Extensions Public/Biochar-sample.pdf"
#     assert_file_exist "${DIR}/Files With a Variety of Extensions Public/Coffee_chart.jpg"
#     assert_file_exist "${DIR}/Files With a Variety of Extensions Public/samplee.mkv"
#     # Skipped to avoid the wrong path error
#     # assert_file_exist "${DIR}/Files With a Variety of Extensions Public/test!_·$%d_%&·_.txt"

#     assert_file_not_exist "${DIR}/Files With a Variety of Extensions Public/CaSe/100byts.txt"
#     assert_file_not_exist "${DIR}/Files With a Variety of Extensions Public/CaSe/100bYtS.txt"
# }

@test "Downloads the root folder of the drive into the dirname of the path if it's a non-existent item inside a valid directory" {
    cd "${DIR}"
    run -0 download_drive "${MY_DRIVE_ID}" "${DIR}/MyCustomFolderName" "0"

    assert_dir_exist "${DIR}/MyCustomFolderName"
    assert_dir_exist "${DIR}/MyCustomFolderName/CaSe"

    assert_file_exist "${DIR}/MyCustomFolderName/1 space test.zip"
    assert_file_exist "${DIR}/MyCustomFolderName/1234567890-asdfzxcvb1234567890-asdfzxcvb1234567890-asdfzxcvb1234567890-asdfzxcvb1234567890-asdfzxcvb.txt"
    assert_file_exist "${DIR}/MyCustomFolderName/13"
    assert_file_exist "${DIR}/MyCustomFolderName/arconnect-archive-team_-_ardrive.html"
    assert_file_exist "${DIR}/MyCustomFolderName/Biochar-sample.pdf"
    assert_file_exist "${DIR}/MyCustomFolderName/Coffee_chart.jpg"
    assert_file_exist "${DIR}/MyCustomFolderName/samplee.mkv"
    # Skipped to avoid the wrong path error
    # assert_file_exist "${DIR}/MyCustomFolderName/test!_·$%d_%&·_.txt"

    assert_file_not_exist "${DIR}/MyCustomFolderName/CaSe/100byts.txt"
    assert_file_not_exist "${DIR}/MyCustomFolderName/CaSe/100bYtS.txt"
}
