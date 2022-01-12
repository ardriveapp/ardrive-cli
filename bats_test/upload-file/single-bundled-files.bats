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
    run -0 bash -c "yarn ardrive upload-file --dry-run --local-path '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET | jq '.created[] .type'"

    assert_line -n 0 '"file"'
    assert_line -n 1 '"bundle"'
    assert_line -n 2 ''

}

@test "upload-file creates v2 transactions when --no-bundle is specified" {
    run -0 bash -c "yarn ardrive upload-file --no-bundle --dry-run --local-path '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET | jq '.created[] .type'"

    assert_line -n 0 '"file"'
    assert_line -n 1 ''
}

@test "upload-file creates 2 bundle transactions with 2 files and --local-paths" {
    run -0 bash -c "yarn ardrive upload-file --dry-run --local-paths '/home/node/10Chunks.txt' '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET | jq '.created[] .type'"

    assert_line -n 0 '"file"'
    assert_line -n 1 '"bundle"'
    assert_line -n 2 '"file"'
    assert_line -n 3 '"bundle"'
    assert_line -n 4 ''
    
}

@test "upload-file creates v2 transactions with 2 files --local-paths and --no-bundle" {
    run -0 bash -c "yarn ardrive upload-file --no-bundle --dry-run --local-paths '/home/node/10Chunks.txt' '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET | jq '.created[] .type'"

    assert_line -n 0 '"file"'
    assert_line -n 1 '"file"'
    assert_line -n 2 ''
}

@test "upload bundled file produces one fee" {
    run -0 bash -c "yarn ardrive upload-file --dry-run --local-path '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET | jq -r '.fees | keys | .[]'"

    assert_line -n 0 --regexp '^(\w|-){43}$'
}

@test "upload file as v2 transactions produces two fees" {
    run -0 bash -c "yarn ardrive upload-file --no-bundle --dry-run --local-path '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET | jq -r '.fees | keys | .[]'"

    assert_line -n 0 --regexp '^(\w|-){43}$'
    assert_line -n 1 --regexp '^(\w|-){43}$'
}