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
    assert_exist "/home/node/tmp/1 space test.zip"
}
@test 'Verifies "arconnect-archive-team_-_ardrive.html" file exists' {
    assert_exist "/home/node/tmp/arconnect-archive-team_-_ardrive.html"
}
@test 'Verifies "13" file exists' {
    assert_exist "/home/node/tmp/13"
}
@test 'Verifies "Biochar-sample.pdf" file exists' {
    assert_exist "/home/node/tmp/Biochar-sample.pdf"
}
@test 'Verifies "Coffee_chart.jpg" file exists' {
    assert_exist "/home/node/tmp/Coffee_chart.jpg"
}
@test 'Verifies "samplee.mkv" file exists' {
    assert_exist "/home/node/tmp/samplee.mkv"
}
@test 'Verifies File with rare chars exists' {
    #BATS parsing issue with that filename, always fails.
    #TODO We need to figure this out for weird file names
    skip
    assert_exist "/home/node/tmp/test!_·\$%d\%&·_.txt"
}
