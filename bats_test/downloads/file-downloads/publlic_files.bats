#!/usr/bin/env bats

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# File methods. DEPENDS on SUPPORT lib.
load '/home/node/packages/node_modules/bats-file/load.bash'
# Assertions.  DEPENDS on SUPPORT lib.
load '/home/node/packages/node_modules/bats-assert/load.bash'

DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" >/dev/null 2>&1 && pwd)"

setup_file() {
    run $DIR/pre_download.sh
    echo "##### Downloaded 7 files" >>/home/node/bats.log
}

@test 'Verifies "1 space test.zip" file exists' {
    assert_exist "/home/node/ardrive-cli/bats_test/downloads/file-downloads/1 space test.zip"
}
@test 'Verifies "arconnect-archive-team_-_ardrive.html" file exists' {
    assert_exist "/home/node/ardrive-cli/bats_test/downloads/file-downloads/arconnect-archive-team_-_ardrive.html"
}
@test 'Verifies "13" file exists' {
    assert_exist "/home/node/ardrive-cli/bats_test/downloads/file-downloads/13"
}
@test 'Verifies "Biochar-sample.pdf" file exists' {
    assert_exist "/home/node/ardrive-cli/bats_test/downloads/file-downloads/Biochar-sample.pdf"
}
@test 'Verifies "Coffee_chart.jpg" file exists' {
    assert_exist "/home/node/ardrive-cli/bats_test/downloads/file-downloads/Coffee_chart.jpg"
}
@test 'Verifies "samplee.mkv" file exists' {
    assert_exist "/home/node/ardrive-cli/bats_test/downloads/file-downloads/samplee.mkv"
}
@test 'Verifies "test!_·$%d\%&·_.txt" file exists' {
    #BATS parsing issue with that filename, always fails
    skip
    assert_exist "/home/node/ardrive-cli/bats_test/downloads/file-downloads/test!_·\$%d\%&·_.txt"
}
