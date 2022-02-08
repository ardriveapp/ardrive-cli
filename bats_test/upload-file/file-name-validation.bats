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

@test "upload file with empty destination file name" {
    run -1 bash -c "yarn ardrive upload-file --dry-run --local-path '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET -d ''"

    assert_line -n 0 "Error: The file name must contain between 1 and 255 characters"
}

@test "upload file with empty destination file name (no bundle)" {
    run -1 bash -c "yarn ardrive upload-file --dry-run --local-path '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET -d '' --no-bundle"

    assert_line -n 0 "Error: The file name must contain between 1 and 255 characters"
}

@test "upload file with long destination file name" {
    run -1 bash -c "yarn ardrive upload-file --dry-run --local-path '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET -d '+==============================================================================================================================================================================================================================================================='"

    assert_line -n 0 "Error: The file name must contain between 1 and 255 characters"
}

@test "upload file with long destination file name (no bundle)" {
    run -1 bash -c "yarn ardrive upload-file --dry-run --local-path '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET --no-bundle -d '+==============================================================================================================================================================================================================================================================='"

    assert_line -n 0 "Error: The file name must contain between 1 and 255 characters"
}
