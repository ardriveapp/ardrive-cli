#!/usr/bin/env bats

bats_require_minimum_version 1.5.0

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# Assertions
load '/home/node/packages/node_modules/bats-assert/load.bash'

@test "'ardrive get-mempool | wc -l' outputs a number of less than 5 digits" {
    # Needs wrapping for piping
    run bash -c "yarn ardrive get-mempool | wc -l"
    assert_output --regexp '^[0-9]{1,4}'
}

@test "'ardrive get-mempool --gateway' will error with an invalid Arweave gateway" {
    run -1 yarn ardrive get-mempool --gateway http://localhost:1337
    assert_line -n 0 'Error: connect ECONNREFUSED 127.0.0.1:1337'
}

@test "'ardrive get-mempool' first line contains a valid TX" {
    # Needs wrapping for piping
    run yarn ardrive get-mempool
    assert_line -n 1 --regexp '(\s){0,}("){1}(\w|-){43}("){1}(,$){1}'
}
