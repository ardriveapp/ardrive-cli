#!/bin/bash

# Depends on ./rename_folder.sh

rename_invalid_names() {
    echo "$(rename_folder "${FOLDER_ID}" " leading spaces.txt")"
    echo "$(rename_folder "${FOLDER_ID}" "trailing spaces.png ")"
    echo "$(rename_folder "${FOLDER_ID}" "trailing dots.doc.")"
    echo "$(rename_folder "${FOLDER_ID}" "reserved characters :*.txt")"
}
