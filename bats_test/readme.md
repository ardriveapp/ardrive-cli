# BATS
## Quick Guide

To run a single file, just use
``` bats <my-test-file.bats>```

e.g.

```bats ../test_samples/testing_hooks/hooks_sample.bats```

Recursion is supported. To run every test inside a given folder:

``` bats -r ../test_samples/``` from ```~/ardrive-cli``` will run each sample

To parallelize jobs just add ```-j <number of jobs>```

e.g. 2 jobs ```bats -r bats_test/ -j 2```

To change output format, ```-F``` plus formatter. 

Supported ones are pretty (default),tap (default w/o term), tap13 (nicer), junit (XML)

## Useful links

Official BATS docs [here](https://bats-core.readthedocs.io/en/stable/index.html)

Docker examples on [test_samples](https://github.com/ardriveapp/ardrive-bats-docker/tree/production/test_samples) folder

[Network monitoring](./network_tools.md)
 
[Wallet interactions](./wallets.md)

[Writing tests](./writing_tests.md)
