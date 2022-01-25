#!/bin/bash

# Depends on ./rename_file.sh

rename_invalid_names() {
    echo "$(rename_file "${PUB_FILE_ID}" " leading spaces.txt")"
    echo "$(rename_file "${PUB_FILE_ID}" "trailing spaces.png ")"
    echo "$(rename_file "${PUB_FILE_ID}" "trailing dots.doc.")"
    echo "$(rename_file "${PUB_FILE_ID}" "reserved characters :*.txt")"
}
