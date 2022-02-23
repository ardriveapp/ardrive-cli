#!/bin/bash

# Depends on ./rename_drive.sh
# Depends on ../..constants.sh

rename_invalid_names() {
    echo "$(rename_drive "${PUB_DRIVE_ID}" "$ENTITY_NAME_LONG")"
}
