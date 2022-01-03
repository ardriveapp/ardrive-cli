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
    echo "##### Downloaded 1 folder" >>/home/node/bats.log
}

@test 'Verifies the "CaSe" folder exists' {
    assert_exist "/home/node/tmp/CaSe"
}

@test 'Verifies the "100byts.txt" file exists' {
    assert_exist "/home/node/tmp/CaSe/100byts.txt"
}

@test 'Verifies the "100bYtes.txt" file exists' {
    assert_exist "/home/node/tmp/CaSe/100bYts.txt"
}
