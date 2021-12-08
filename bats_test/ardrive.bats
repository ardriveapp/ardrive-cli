#!/usr/bin/env bats

@test "example status and output lines" {
    #Instead we could use absolute path directly OR
    #We fetch current test file dir absolute path redirecting stdout.
    #DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")" >/dev/null 2>&1 && pwd)

    #We run command using DIR as Absolute Path
    run yarn ardrive

    #check stdout
    [ "${status}" -eq 0 ]
    [ "${lines[0]}" = "Usage: ardrive [command] [command-specific options]" ]
}

node@2541a765f4f0:~/ardrive-cli$ exit
exit
ariel@Ariels-MacBook-Pro ardr
