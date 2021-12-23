#!/usr/bin/env bats

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# Assertions
load '/home/node/packages/node_modules/bats-assert/load.bash'

setup_file() {
    run $DIR/create-file.sh
    echo "##### Created 10 chunk test file" >>/home/node/bats.log

    # Start test from correct working directory
    # TODO: Use a $HOME variable for local testing support
    cd /home/node/ardrive-cli
}

@test "upload-file creates a bundled transaction by default" {
    run -0 bash -c "yarn ardrive upload-file --dry-run -l '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET | jq '.created[] .type'"

    assert_line -n 0 '"file"'
    assert_line -n 1 '"bundle"'
    assert_line -n 2 ''

}

@test "upload-file creates v2 transactions when --no-bundle is specified" {
    run -0 bash -c "yarn ardrive upload-file --no-bundle --dry-run -l '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET | jq '.created[] .type'"

    assert_line -n 0 '"file"'
    assert_line -n 1 ''
}

@test "upload bundled file produces two fees" {
    run -0 bash -c "yarn ardrive upload-file --dry-run -l '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET | jq '.fees'"

    assert_line -n 0 '{'
    assert_line -n 1 --regexp '(\s){0,}("){1}(\w|-){43}("){1}'
    assert_line -n 2 --regexp '(\s){0,}("){1}(\w|-){43}("){1}'
    assert_line -n 3 '}'   
}

@test "upload file as v2 transactions produces three fees" {
    run -0 bash -c "yarn ardrive upload-file --no-bundle --dry-run -l '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET | jq '.fees'"

    assert_line -n 0 '{'
    assert_line -n 1 --regexp '(\s){0,}("){1}(\w|-){43}("){1}'
    assert_line -n 2 --regexp '(\s){0,}("){1}(\w|-){43}("){1}'
    assert_line -n 3 --regexp '(\s){0,}("){1}(\w|-){43}("){1}'
    assert_line -n 4 '}'
}