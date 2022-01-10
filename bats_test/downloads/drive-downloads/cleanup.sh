#!/bin/bash

DIR="$(cd "$(dirname "${BATS_TEST_FILENAME}")" >/dev/null 2>&1 && pwd)"

rm -rf \
    "${DIR}/Files With a Variety of Extensions Public" \
    "${DIR}/My custom folder name" \
    "${DIR}/existing_file.txt" \
    "${DIR}/existing_fifo"

exit 0