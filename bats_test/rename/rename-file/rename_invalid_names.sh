#!/bin/bash

# Depends on ./rename_file.sh
# Depends on ../..constants.sh

rename_invalid_names() {
    echo "$(rename_file "${PUB_FILE_ID}" "$ENTITY_NAME_LONG")"
}
