#!/usr/bin/env bats

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# Assertions
load '/home/node/packages/node_modules/bats-assert/load.bash'

DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" >/dev/null 2>&1 && pwd)"

setup_file() {
    run $DIR/create-file.sh
    echo "##### Created test files" >>/home/node/bats.log

    run $DIR/create-folder.sh
    echo "##### Created bulk test folder" >>/home/node/bats.log

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

@test "upload-file creates 1 bundled transaction with 2 files and --local-paths" {
    run -0 bash -c "yarn ardrive upload-file --dry-run --local-paths '/home/node/10Chunks.txt' '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET | jq '.created[] .type'"

    assert_line -n 0 '"file"'
    assert_line -n 1 '"file"'
    assert_line -n 2 '"bundle"'
    assert_line -n 3 ''
    
}

@test "upload-file used on a bulk folder returns the expected results" {
    run -0 bash -c "yarn ardrive upload-file --dry-run --local-path '/home/node/root_folder' -F $PUB_FOLD_ID -w $WALLET | jq '.created[] .type'"

    assert_line -n 0 '"folder"'
    assert_line -n 1 '"folder"'
    assert_line -n 2 '"folder"'
    assert_line -n 3 '"file"'
    assert_line -n 4 '"file"'
    assert_line -n 5 '"file"'
    assert_line -n 6 '"bundle"'
    assert_line -n 7 ''
}

@test "upload-file used on a bulk folder with --no-bundle returns the expected results" {
    run -0 bash -c "yarn ardrive upload-file --no-bundle --dry-run --local-path '/home/node/root_folder' -F $PUB_FOLD_ID -w $WALLET | jq '.created[] .type'"

    assert_line -n 0 '"folder"'
    assert_line -n 1 '"folder"'
    assert_line -n 2 '"folder"'
    assert_line -n 3 '"file"'
    assert_line -n 4 '"file"'
    assert_line -n 5 '"file"'
    assert_line -n 7 ''
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
    assert_line -n 1 ''
}

@test "upload bulk folder bundled produces one fee" {
    run -0 bash -c "yarn ardrive upload-file --dry-run --local-path '/home/node/root_folder' -F $PUB_FOLD_ID -w $WALLET | jq -r '.fees | keys | .[]'"

    assert_line -n 0 --regexp '^(\w|-){43}$'
    assert_line -n 1 ''
}

@test "upload file as v2 transactions produces two fees" {
    run -0 bash -c "yarn ardrive upload-file --no-bundle --dry-run --local-path '/home/node/10Chunks.txt' -F $PUB_FOLD_ID -w $WALLET | jq -r '.fees | keys | .[]'"

    assert_line -n 0 --regexp '^(\w|-){43}$'
    assert_line -n 1 --regexp '^(\w|-){43}$'
    assert_line -n 2 ''
}

@test "upload bulk folder as v2 tx produces nine fees" {
    run -0 bash -c "yarn ardrive upload-file --no-bundle --dry-run --local-path '/home/node/root_folder' -F $PUB_FOLD_ID -w $WALLET | jq -r '.fees | keys | .[]'"

    assert_line -n 0 --regexp '^(\w|-){43}$'
    assert_line -n 1 --regexp '^(\w|-){43}$'
    assert_line -n 2 --regexp '^(\w|-){43}$'
    assert_line -n 3 --regexp '^(\w|-){43}$'
    assert_line -n 4 --regexp '^(\w|-){43}$'
    assert_line -n 5 --regexp '^(\w|-){43}$'
    assert_line -n 6 --regexp '^(\w|-){43}$'
    assert_line -n 7 --regexp '^(\w|-){43}$'
    assert_line -n 8 --regexp '^(\w|-){43}$'
    assert_line -n 9 ''
}

@test "Duplicate name uploads nothing with --skip" {
    #We don't care about deleting this. Lives on Docker FS only
    #We use quotes to escape possible spaces
    run bash -c "touch '$PUB_FILE_NAME'"
    #Again we use quotes to escape spaces
    run -0 bash -c "yarn ardrive upload-file --dry-run --local-path ./'$PUB_FILE_NAME' -F $PARENT_FOLDER_ID -w $WALLET --skip | jq -r '.created | length'"

    assert_output 0
}

@test "Duplicate name uploads a new file with --upsert" {
    run bash -c "touch '$PUB_FILE_NAME'"
    run -0 bash -c "yarn ardrive upload-file --dry-run --local-path ./'$PUB_FILE_NAME' -F $PARENT_FOLDER_ID -w $WALLET --upsert | jq -r '.created | .[] | .type'"

    assert_line -n 0 "file"
    assert_line -n 1 "bundle"
}
