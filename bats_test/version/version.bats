#!/usr/bin/env bats

bats_require_minimum_version 1.5.0

EXPECTED_VERSION=$(jq -r '.version' ./package.json)

@test "'ardrive --version' prints the version" {
    run -0 yarn ardrive --version
    [[ "$output" = "$EXPECTED_VERSION" ]]

}

@test "'ardrive -V' prints the version" {
    run -0 yarn ardrive -V
    [[ "$output" = "$EXPECTED_VERSION" ]]
}

@test "'ardrive <SOME COMMAND> -V' ONLY prints the version" {
    run -0 yarn ardrive tx-status -V
    [[ "$output" = "$EXPECTED_VERSION" ]]
}
