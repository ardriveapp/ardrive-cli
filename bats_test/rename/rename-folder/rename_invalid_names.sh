#!/bin/bash

# Depends on ./rename_folder.sh
# Depends on ../..constants.sh

rename_invalid_names() {
    echo "$(rename_folder "${FOLDER_ID}" "$ENTITY_NAME_LONG")"
}
