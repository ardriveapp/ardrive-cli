#!/usr/bin/env bats

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# Assertions
load '/home/node/packages/node_modules/bats-assert/load.bash'

@test "'ardrive base-reward -h' prints help with all expected fields" {
    run -0 yarn ardrive base-reward -h
    assert_line --index 0 'Usage: ardrive base-reward [options]'
    assert_line --index 1 'Options:'
    assert_line -n 2 '  --boost <boost>         (OPTIONAL) a multiple of the base transaction mining'
    assert_line --index 3 '                          reward that can be used to accelerate transaction'
    assert_line --index 4 '                          mining. A multiple of 2.5 would boost a 100 Winston'
    assert_line --index 5 '                          transaction reward to 250 Winston.'
    assert_line -n 6 "  -g --gateway <gateway>  (OPTIONAL) a 'protocol://host:port' formatted string"
    assert_line -n 7 "                          specifying the connection info for the Arweave"
    assert_line -n 8 "                          gateway server to use"
    assert_line -n 9 '  -h, --help              display help for command'
}

@test "'ardrive base-reward --help' prints help with all expected fields" {
    run -0 yarn ardrive base-reward --help
    assert_line --index 0 'Usage: ardrive base-reward [options]'
    assert_line --index 1 'Options:'
    assert_line -n 2 '  --boost <boost>         (OPTIONAL) a multiple of the base transaction mining'
    assert_line --index 3 '                          reward that can be used to accelerate transaction'
    assert_line --index 4 '                          mining. A multiple of 2.5 would boost a 100 Winston'
    assert_line --index 5 '                          transaction reward to 250 Winston.'
    assert_line -n 6 "  -g --gateway <gateway>  (OPTIONAL) a 'protocol://host:port' formatted string"
    assert_line -n 7 "                          specifying the connection info for the Arweave"
    assert_line -n 8 "                          gateway server to use"
    assert_line -n 9 '  -h, --help              display help for command'
}
