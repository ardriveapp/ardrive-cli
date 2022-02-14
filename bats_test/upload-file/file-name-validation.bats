#!/usr/bin/env bats

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# Assertions
load '/home/node/packages/node_modules/bats-assert/load.bash'
# Constants
load '../constants.sh'

DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" >/dev/null 2>&1 && pwd)"

setup_file() {
    run $DIR/create-file.sh
    echo "##### Created 10 chunk test file" >>/home/node/bats.log

    # Start test from correct working directory
    # TODO: Use a $HOME variable for local testing support
    cd /home/node/ardrive-cli
}

@test "upload file with empty destination file name results in an error message and exit code 1" {
    run -1 bash -c "yarn ardrive upload-file --dry-run --local-path '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET -d ''"

    assert_line -n 0 "Error: The file name cannot be empty"
}

@test "upload file with empty destination file name (no bundle) results in an error message and exit code 1" {
    run -1 bash -c "yarn ardrive upload-file --dry-run --local-path '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET -d '' --no-bundle"

    assert_line -n 0 "Error: The file name cannot be empty"
}

@test "upload file with long destination file name results in an error message and exit code 1" {
    run -1 bash -c "yarn ardrive upload-file --dry-run --local-path '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET -d $ENTITY_NAME_LONG"

    assert_line -n 0 'Error: The file name must not exceed 255 bytes'
}

@test "upload file with long destination file name (no bundle) results in an error message and exit code 1" {
    run -1 bash -c "yarn ardrive upload-file --dry-run --local-path '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET --no-bundle -d $ENTITY_NAME_LONG"

    assert_line -n 0 'Error: The file name must not exceed 255 bytes'
}
