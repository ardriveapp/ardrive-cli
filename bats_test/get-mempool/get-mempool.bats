#!/usr/bin/env bats

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# Assertions
load '/home/node/packages/node_modules/bats-assert/load.bash'

@test "'ardrive get-mempool | wc -l' outputs a number of less than 5 digits" {
    # Needs wrapping for piping
    run bash -c "yarn ardrive get-mempool | wc -l"
    assert_output --regexp '^[0-9]{1,4}'
}

@test "'ardrive get-mempool' first line contains a valid TX" {
    # Needs wrapping for piping
    run yarn ardrive get-mempool
    assert_line -n 1 --regexp '([^"](\w|-){42})'
}
