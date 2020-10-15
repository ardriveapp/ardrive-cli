# ardrive-cli
The ArDrive Command Line Interface (CLI) Beta contains all of the needed public file synchronization and Arweave wallet capabilities via a Node.js application.  This works in unison with the ArDrive Web App.

This app is currently in beta testing, and as such may have bugs and does not offer Private/Encrypted Drives.

To use the ArDrive CLI, install it with your favorite package manager, and run "ardrive-cli".  As of now, the local SQLite database will be created in the directory that you run the CLI in.  If you are experiencing permissions issues (Mac OSX), you may also need to place your wallet file in the same directory you are running ardrive-cli

```
$ npm i ardrive-cli -g
$ ardrive-cli
```

