# Writing BATS tests

Some guidelines on writing your own BATS tests
## Globals

There are several global variables you can use to introspect on Bats tests:

- $BATS_TEST_FILENAME is the fully expanded path to the Bats test file.

- $BATS_TEST_DIRNAME is the directory in which the Bats test file is located.

- $BATS_TEST_NAMES is an array of function names for each test case.

- $BATS_TEST_NAME is the name of the function containing the current test case.

- $BATS_TEST_DESCRIPTION is the description of the current test case.

- $BATS_TEST_NUMBER is the (1-based) index of the current test case in the test file.

- $BATS_TMPDIR is the location to a directory that may be used to store temporary files.

- $BATS_RUN_COMMAND string contains the command and command arguments passed to *run* 
  
Check every variable [here](https://bats-core.readthedocs.io/en/stable/writing-tests.html#special-variables)
## Support libs

[Support](https://github.com/bats-core/bats-support#bats-support)

[Files](https://github.com/bats-core/bats-file#index-of-all-functions)

[Assertions](https://github.com/bats-core/bats-assert#usage)


## Basic Commands

### Log to console

Always  ``` echo 'text' >&3 ```

Only on failures ```echo 'text' ```

### Assertions and running commands

Use *run*. It will execute commands in a sub-shell. Can execute scripts as well.

```
@test "invoking foo with a nonexistent file prints an error" {
  run -1 foo nonexistent_filename
  [ "$output" = "foo: no such file 'nonexistent_filename'" ]
}
```

```run``` alongside ```-1``` fails if status is not 1. We can replace that number for any number we want to check any exit code.

```$output``` is how we check the complete input of a command

``` [ "$output" = "<Check output form run here>" ]``` 

```[ "${lines[0]}" = "Line output here" ]``` is how we check a specific line. In this case, line 0.

Please check complete BATS docs [here](https://bats-core.readthedocs.io/en/stable/index.html)

There are also many examples on [test_samples](https://github.com/ardriveapp/ardrive-bats-docker/tree/production/test_samples) folder
 