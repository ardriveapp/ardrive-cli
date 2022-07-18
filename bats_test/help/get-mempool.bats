#!/usr/bin/env bats

bats_require_minimum_version 1.5.0

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# Assertions
load '/home/node/packages/node_modules/bats-assert/load.bash'

@test "'ardrive get-mempool -h' prints help with all expected fields" {
    run -0 yarn ardrive get-mempool -h
    assert_line --index 0 'Usage: ardrive get-mempool [options]'
    assert_line --index 1 'Options:'
    assert_line -n 2 "  -g --gateway <gateway>  (OPTIONAL) a 'protocol://host:port' formatted string"
    assert_line -n 3 "                          specifying the connection info for the Arweave"
    assert_line -n 4 "                          gateway server to use"
    assert_line -n 5 '  -h, --help              display help for command'
}

@test "'ardrive get-mempool --help' prints help with all expected fields" {
    run -0 yarn ardrive get-mempool --help
    assert_line --index 0 'Usage: ardrive get-mempool [options]'
    assert_line --index 1 'Options:'
    assert_line -n 2 "  -g --gateway <gateway>  (OPTIONAL) a 'protocol://host:port' formatted string"
    assert_line -n 3 "                          specifying the connection info for the Arweave"
    assert_line -n 4 "                          gateway server to use"
    assert_line -n 5 '  -h, --help              display help for command'
}
