# ardrive-cli

The ArDrive Command Line Interface (CLI) Beta contains all of the needed public file synchronization and Arweave wallet capabilities via a Node.js application. This works in unison with the ArDrive Web App.

This app is currently in beta testing, and as such may have bugs and does not offer Private/Encrypted Drives.

To use the ArDrive CLI, install it with your favorite package manager, and run "ardrive-cli". As of now, the local SQLite database will be created in the directory that you run the CLI in. If you are experiencing permissions issues (Mac OSX), you may also need to place your wallet file in the same directory you are running ardrive-cli

## Setup

### NVM

This repo uses NVM and an `.nvmrc` file to lock the Node version to the current version used by `ardrive-core-js`. Follow these steps to get NVM up and running on your system:

1. Install NVM using [these installation instructions][nvm-install].
2. Navigate to this project's root directory (`ardrive-cli`)
3. Ensure that the correct version of Node is installed by performing: `nvm install`
4. Use the correct version of Node, by using: `nvm use`

### We use Yarn 2

```
$ yarn install
$ ardrive-cli
```

For more info please check: https://yarnpkg.com/cli/install

### We use husky >6.

You will need to run

```
yarn husky install
```

to enable hooks locally on your repo

[nvm-install]: https://github.com/nvm-sh/nvm#installing-and-updating
