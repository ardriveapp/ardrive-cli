#!/usr/bin/env bats

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# Assertions
load '/home/node/packages/node_modules/bats-assert/load.bash'

@test "create-drive creates a bundled drive by default" {
    run -0 bash -c "yarn ardrive create-drive --dry-run -n 'Stub-Name' -w $WALLET | jq '.created[] .type'"

    assert_line -n 0 '"drive"'
    assert_line -n 1 '"folder"'
    assert_line -n 2 '"bundle"'
}

@test "create-drive creates a non-bundled drive when --no-bundle is specified" {
    run -0 bash -c "yarn ardrive create-drive --dry-run -n 'Stub-Name --no-bundle' -w $WALLET | jq '.created[] .type'"

    assert_line -n 0 '"drive"'
    assert_line -n 1 '"folder"'
}

@test "create bundled drive produces one fee" {
    run -0 bash -c "yarn ardrive create-drive --dry-run -n 'Stub-Name' -w $WALLET | jq '.fees'"

    assert_line -n 0 '{'
    assert_line -n 1 --regexp '(\s){0,}("){1}(\w|-){43}("){1}'
    assert_line -n 2 '}'
}

@test "create drive as v2 transactions produces two fees" {
    run -0 bash -c "yarn ardrive create-drive --dry-run -n 'Stub-Name' -w $WALLET --no-bundle | jq '.fees'"

    assert_line -n 0 '{'
    assert_line -n 1 --regexp '(\s){0,}("){1}(\w|-){43}("){1}'
    assert_line -n 2 --regexp '(\s){0,}("){1}(\w|-){43}("){1}'
    assert_line -n 3 '}'
}

# This test is commented out until there is a password variable for private use cases
# @test "private create-drive output contains drive keys on created entities" {
#     run -0 bash -c "yarn ardrive create-drive --dry-run -n 'Stub-Name' -w $WALLET  -p $PASSWORD | jq '.created[] .key'"

#     [ "${lines[0]}" = "${lines[1]}" ]
#     assert_line -n 2 'null'
# }