#!/usr/bin/env bats

# Support lib
load '/home/node/packages/node_modules/bats-support/load.bash'
# Assertions
load '/home/node/packages/node_modules/bats-assert/load.bash'

DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" >/dev/null 2>&1 && pwd)"

setup_file() {
    run $DIR/create-file.sh
    echo "##### Created 10 chunk test file" >>/home/node/bats.log
}

@test "'ardrive upload-file' data trx reward matches the price from the arweave gateway" {
    rewardFromNetwork="$(bash -c $DIR/reward.sh)"
    rewardFromUpload="$(bash -c $DIR/upload-test.sh)"

    [ "$rewardFromUpload" = "$rewardFromNetwork" ]
}

