#!/usr/bin/env bats

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# Assertions
load '/home/node/packages/node_modules/bats-assert/load.bash'

@test "create drive with empty name" {
    run -1 bash -c "yarn ardrive create-drive --dry-run -n '' -w $WALLET"

    assert_line -n 0 "Error: Required parameter driveName wasn't provided!"
}

@test "create drive with long name" {
    run -1 bash -c "yarn ardrive create-drive --dry-run -n '+===============================================================================================================================================================================================================================================================' -w $WALLET"

    assert_line -n 0 'Error: The drive name must contain between 1 and 255 characters'
}