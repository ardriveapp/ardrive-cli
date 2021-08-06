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

This repository uses NVM and an `.nvmrc` file to lock the Node version to the current version used by `ardrive-core-js`.

**Note for Windows: We recommend using WSL for setting up NVM on Windows using the [instructions described here][wsl-install]**

Follow these steps to get NVM up and running on your system:

1. Install NVM using [these installation instructions][nvm-install].
2. Navigate to this project's root directory
3. Ensure that the correct version of Node is installed by performing: `nvm install`
4. Use the correct version of Node, by using: `nvm use`

### Using a custom ArDrive-Core-JS

To test a with a custom version of the `ardrive-core-js` library on your local system, change the `"ardrive-core-js"` line in `package.json` to the root of your local `ardrive-core-js` repo:

```diff
- "ardrive-core-js": "1.0.0"
+ "ardrive-core-js": "../ardrive-core-js/"
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

### Recommended Visual Studio Code extensions

To ensure your environment is compatible, we also recommend the following VSCode extensions:

-   [ES-Lint][eslint-vscode]
-   [Editor-Config][editor-config-vscode]
-   [Prettier][prettier-vscode]
-   [ZipFS][zipfs-vscode]

[yarn-install]: https://yarnpkg.com/getting-started/install
[nvm-install]: https://github.com/nvm-sh/nvm#installing-and-updating
[wsl-install]: https://code.visualstudio.com/docs/remote/wsl
[editor-config-vscode]: https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig
[prettier-vscode]: https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode
[zipfs-vscode]: https://marketplace.visualstudio.com/items?itemName=arcanis.vscode-zipfs
[eslint-vscode]: https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint
