#!/usr/bin/env bats

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# Assertions
load '/home/node/packages/node_modules/bats-assert/load.bash'
# Constants
load '../constants.sh'

@test "create drive with empty name results in an error message and exit code 1" {
    run -1 bash -c "yarn ardrive create-drive --dry-run -n '' -w $WALLET"

    assert_line -n 0 "Error: Required parameter driveName wasn't provided!"
}

@test "create drive with long name results in an error message and exit code 1" {
    run -1 bash -c "yarn ardrive create-drive --dry-run -n $ENTITY_NAME_LONG -w $WALLET"

    assert_line -n 0 'Error: The drive name must be smaller than 255 bytes'
}
