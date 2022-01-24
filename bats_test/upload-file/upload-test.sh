#!/bin/bash

cd /home/node/ardrive-cli

yarn ardrive upload-file --no-bundle --dry-run -w $WALLET -l '/home/node/10Chunks.txt' -F $PUB_FOLD_ID | jq -c '.fees' | awk -F '"' '{ print $4 }'

exit 0
