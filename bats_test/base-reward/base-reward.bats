#!/usr/bin/env bats

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# Assertions
load '/home/node/packages/node_modules/bats-assert/load.bash'

@test "'ardrive base-reward' outputs a positive integer number" {
    run -0 yarn ardrive base-reward
    assert_output --regexp '^[0-9]+$'
}

@test "'ardrive base-reward --gateway' will error with an invalid Arweave gateway" {
    run yarn ardrive base-reward --gateway http://fakeway.net
    assert_line -n 0 'Error: getaddrinfo ENOTFOUND fakeway.net'
}
