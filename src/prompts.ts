import { sep } from 'path';
import {
  getLocalWallet,
  createArDriveWallet,
  getAllMyPrivateArDriveIds,
  getAllMyPublicArDriveIds,
  checkOrCreateFolder,
  backupWallet,
  checkFileExistsSync,
} from 'ardrive-core-js';
import { ArDriveUser, UploadBatch } from 'ardrive-core-js/lib/types';

const prompt = require ('prompt-sync')({sigint: true});
import passwordPrompt from 'prompts';
const { v4: uuidv4 } = require('uuid');

// Get path to local wallet and return that wallet public and private key
const promptForLocalWalletPath = async () : Promise<string> => {
  console.log(
    'Please enter the path of your existing Arweave Wallet JSON file eg. C:\\Source\\ardrive_test_key.json'
  );
  const existingWalletPath = prompt('Wallet Path: ');
  const validPath = checkFileExistsSync(existingWalletPath);
  if (validPath) {
    return existingWalletPath;
  } else {
    console.log ("File path is invalid!");
    return promptForLocalWalletPath();
  }
};

// Get the ArDrive owner nickname
export const promptForLogin = async () => {
  console.log('Please enter your ArDrive Login Name.  If no name exists, we will create a new ArDrive for you.');
  const login = prompt('Login Name: ');
  return login;
};

// Get the ArDrive owner nickname
const promptForArDriveId = async (arDriveMetadata: any, drivePrivacy: string) : Promise<any> => {
  console.log(
    'Existing %s ArDrive IDs have been found for this wallet.  Which one would you like to use?', drivePrivacy
  );
  let i = 0;
  arDriveMetadata.forEach((arDrive: any) => {
    console.log('%s: %s | TX %s', i, arDrive.driveId, arDrive.metaDataTx);
    i += 1;
  });
  console.log('%s: Generate a new ArDrive ID', i);
  const choice = prompt('Please select which number: ');
  if (+choice === i) {
    return uuidv4();
  }
  return arDriveMetadata[choice];
};

// Get the location to backup the new wallet
const promptForBackupWalletPath = (): string => {
  console.log(
    'Please enter the path to backup your new ArDrive Wallet e.g C:\\My_Safe_Location'
  );
  console.log('Your ArDrive Wallet is the key to open all your ArDrive data.');
  console.log('        Do NOT share it!');
  console.log('        Do NOT lose it!');
  console.log('        Do NOT save it on cloud storage.');
  console.log('        Do NOT save it on your ArDrive');
  const backupFolderPath = prompt(
    'ArDrive Wallet Backup Folder Path: ',
    process.cwd().concat(sep, 'Backup', sep)
  );
  const validPath = checkOrCreateFolder(backupFolderPath);
  if (validPath === '0') {
    return promptForBackupWalletPath();
  }
  return backupFolderPath;
};

// Get the ArDrive Sync Folder path
// Will handle error checking and ensuring it is a valid path
const promptForSyncFolderPath = (): string => {
  // Setup ArDrive Sync Folder
  console.log(
    'Please enter the path of your local ArDrive folder e.g D:\\ArDriveSync.  A new folder will be created if it does not exist'
  );
  const syncFolderPath = prompt(
    'ArDrive Sync Folder Path: ',
    process.cwd().concat(sep, 'Sync', sep)
  );

  const validPath = checkOrCreateFolder(syncFolderPath);
  if (validPath === '0') {
    return promptForSyncFolderPath();
  }
  return syncFolderPath;
};

// Setup ArDrive Login Password
// Modify to check for password strength
const promptForNewLoginPassword = async () => {
  console.log(
    'Your ArDrive Login password will be used to unlock your ArDrive and start syncing.'
  );
  const newLoginPasswordResponse = await passwordPrompt({
    type: 'text',
    name: 'password',
    style: 'password',
    message: 'Please enter a strong ArDrive Login password: ',
  });
  return newLoginPasswordResponse.password;
};

// Setup ArDrive Data Protection Password
// TO DO Modify to check for password strength
const promptForDataProtectionKey = async () => {
  console.log(
    'Your ArDrive Data Protection password will be used to encrypt your data on the Permaweb.  Do NOT lose this!!!'
  );
  const dataProtectionKeyResponse = await passwordPrompt({
    type: 'text',
    name: 'password',
    style: 'password',
    message: 'Please enter a strong ArDrive Encryption password: ',
  });
  return dataProtectionKeyResponse.password;
};

// Get the users wallet or create a new one
const promptForWallet = async () => {
  // Create new or import Arweave wallet
  console.log('To use ArDrive, you must have an Arweave Wallet.');
  const existingWallet = prompt(
    'Do you have an existing Arweave Wallet (.json file) Y/N '
  );
  return existingWallet;
};

// Prompts the user to enter a login password
const promptForLoginPassword = async () => {
  const loginPasswordResponse = await passwordPrompt({
    type: 'text',
    name: 'password',
    style: 'password',
    message: 'Please enter your ArDrive Login password: ',
  });
  return loginPasswordResponse.password;
};

// Collects all of the information needed to create a new user
// This includes Wallet, Existing ArDrives and Sync Folder Path
const promptForNewUserInfo = async (login: string) => {
  let wallet;
  let user: ArDriveUser = {
    login: login,
    privateArDriveId: "0",
    privateArDriveTx: "0",
    publicArDriveId: "0",
    publicArDriveTx: "0",
    dataProtectionKey: "",
    walletPrivateKey: "",
    walletPublicKey: "",
    syncFolderPath: "",
  }
  try {
    const existingWallet = await promptForWallet();
    if (existingWallet === 'N') {
      wallet = await createArDriveWallet();
      const backupWalletPath = await promptForBackupWalletPath();
      await backupWallet(backupWalletPath, wallet, login);
    } else {
      const existingWalletPath = await promptForLocalWalletPath();
      wallet = await getLocalWallet(existingWalletPath);
    }

    user.walletPrivateKey = wallet.walletPrivateKey;
    user.walletPublicKey = wallet.walletPublicKey;

    // Load an existing default Private ArDrive
    const privateArDrives = await getAllMyPrivateArDriveIds(wallet.walletPublicKey);
    if (privateArDrives[0].driveId !== '') {
      const privateArDriveMetadata = await promptForArDriveId(privateArDrives, "Private");
      user.privateArDriveId = privateArDriveMetadata.driveId;
      user.privateArDriveTx = privateArDriveMetadata.metaDataTx;
    } else {
      user.privateArDriveId = uuidv4();
      console.log ("No existing Private ArDrives found.  Creating a new one.")
      console.log ("   Private Drive-Id: %s", user.privateArDriveId)
    }

    // Load an existing default Public ArDrive
    const publicArDrives = await getAllMyPublicArDriveIds(wallet.walletPublicKey);
    if (publicArDrives[0].driveId !== '') {
      const publicArDriveMetadata = await promptForArDriveId(publicArDrives, "Public");
      user.publicArDriveId = publicArDriveMetadata.driveId;
      user.publicArDriveTx = publicArDriveMetadata.metaDataTx;
    } else {
      console.log ("No existing Public ArDrives found.  Creating a new one.")
      user.publicArDriveId = uuidv4();
      console.log ("   Public Drive-Id: %s", user.publicArDriveId)
    }

    user.syncFolderPath = await promptForSyncFolderPath();
    user.dataProtectionKey = await promptForDataProtectionKey();
    return user;
  } catch (err) {
    console.log(err);
    return user;
  }
};

// Asks the user to approve an upload to Arweave
const promptForArDriveUpload = async (uploadBatch: UploadBatch) : Promise<boolean> => {
  console.log(
    'Uploading %s files, %s folders and %s changes (%s) to the Permaweb, totaling %s AR',
    uploadBatch.totalNumberOfFileUploads,
    uploadBatch.totalNumberOfFolderUploads,
    uploadBatch.totalNumberOfMetaDataUploads,
    uploadBatch.totalSize,
    uploadBatch.totalArDrivePrice
  );
  const readyToUpload = prompt('Upload all unsynced files? Y/N ');
  if (readyToUpload == 'Y')
    return true;
  else {
    return false;
  }
};

// Prompt the user if they want to rename, overwrite or ignore file conflict
const promptForFileOverwrite = async (fullPath: any) => {
  console.log(
    'A file has been found on the Permaweb with a different hash but the same file name %s',
    fullPath
  );
  const conflict = prompt(
    'Would you like to Overwrite (O) Rename (R) or Ignore (I): '
  );
  return conflict;
};

export { promptForArDriveUpload, promptForFileOverwrite, promptForNewUserInfo, promptForNewLoginPassword, promptForLoginPassword }