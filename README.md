# ardrive-cli

The ArDrive Command Line Interface (CLI) Beta contains all of the needed public file synchronization and Arweave wallet capabilities via a Node.js application. This works in unison with the ArDrive Web App.

To use the ArDrive CLI, install it with your favorite package manager, and run "ardrive-cli". As of now, the local SQLite database will be created in the directory that you run the CLI in.

If you are experiencing permissions issues (Mac OSX), you may also need to place your wallet file in the same directory you are running ardrive-cli

## Developer Setup

Follow these steps to get the developer environment up and running:

### Install Yarn 2

Both the ArDrive CLI and ArDrive Core JS use Yarn 2, so install the latest version with the [yarn installation instructions][yarn-install]. In most cases:

```shell
# Brew:
brew install yarn

# Or with NPM:
npm install -g yarn
```

We also use husky. To enable hooks locally, you will need to run:

```shell
yarn husky install
```

### NVM

This repository uses NVM and an `.nvmrc` file to lock the Node version to the current version used by `ardrive-core-js`. Follow these steps to get NVM up and running on your system:

1. Install NVM using [these installation instructions][nvm-install].
2. Navigate to this project's root directory
3. Ensure that the correct version of Node is installed by performing: `nvm install`
4. Use the correct version of Node, by using: `nvm use`

### ArDrive-Core-JS

You'll need a build of the `ardrive-core-js` library on your local system to run the CLI:

```shell
git clone https://github.com/ardriveapp/ardrive-core-js
```

Follow the steps in the README of `ardrive-core-js`, and then build the project.

Next, change the line below in `package.json` to the root of your local `ardrive-core-js` repo.
If both repositories are located in the same directory, add this line:

```diff
-	"ardrive-core-js": "REPLACE WITH you local ardrive-core",
+ "ardrive-core-js": "../ardrive-core-js",
```

### Installing and Starting the CLI

Now that everything is set up, to install the package simply run:

```shell
yarn
```

And then start the CLI:

```shell
yarn start
```

[yarn-install]: https://yarnpkg.com/getting-started/install
[nvm-install]: https://github.com/nvm-sh/nvm#installing-and-updating
