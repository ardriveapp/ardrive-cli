#!/usr/bin/env bats

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# Assertions
load '/home/node/packages/node_modules/bats-assert/load.bash'

@test "'ardrive base-reward' outputs a number" {
    run -0 yarn ardrive base-reward
    assert_output --regexp '^[0-9]+$'
}
