#!/bin/bash

cd $HOME/ardrive-cli/

cache="$(yarn ardrive list-all-drives -w $WALLET)"
driveID="$(echo $cache | jq '[.. | select(.drivePrivacy? == "public")][0] | .driveId' | cut -d '"' -f 2)"
folderID="$(echo $cache | jq '[.. | select(.drivePrivacy? == "public")][0] | .rootFolderId' | cut -d '"' -f 2)"

export PUB_DRIVE_ID="$driveID"
export PUB_FOLD_ID="$folderID"
