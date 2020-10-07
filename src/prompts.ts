import {
  getLocalWallet,
  createArDriveWallet,
  getAllMyPrivateArDriveIds,
  getAllMyPublicArDriveIds,
  checkOrCreateFolder,
  backupWallet,
  checkFileExistsSync,
  addDriveToDriveTable,
  createNewPublicDrive,
  createNewPrivateDrive,
} from 'ardrive-core-js';
import { ArDriveUser, ArFSDriveMetadata, UploadBatch } from 'ardrive-core-js/lib/types';

const prompt = require ('prompt-sync')({sigint: true});
import passwordPrompt from 'prompts';
import { Path } from 'typescript';

// Get the users wallet or create a new one
const promptForWallet = () : String => {
  // Create new or import Arweave wallet
  const existingWallet: string = prompt(
    '   Do you have an existing Arweave Wallet .json file? (default is Yes) Y/N '
  );
  return existingWallet;
};

// Get path to local wallet and return that wallet public and private key
const promptForLocalWalletPath = () : Path => {
  console.log('Please enter the path of your existing Arweave Wallet JSON file eg. C:\\Source\\ardrive_test_key.json');
  const existingWalletPath : Path = prompt('   Wallet Path: ');

  // This should be updated to check if valid .json file
  const validPath = checkFileExistsSync(existingWalletPath);
  if (validPath) {
    return existingWalletPath;
  } else {
    console.log ("File path is invalid!");
    return promptForLocalWalletPath();
  }
};

// Get the location to backup the new wallet
const promptForBackupWalletPath = (): Path => {
  console.log(
    'Please enter the path to backup your new ArDrive Wallet e.g C:\\My_Safe_Location'
  );
  const backupFolderPath : Path = prompt('   ArDrive Wallet Backup Folder Path (hit enter for current directory): ');
  const validPath : Path | String = checkOrCreateFolder(backupFolderPath);
  if (validPath === '0') {
    return promptForBackupWalletPath();
  }
  return backupFolderPath;
};

// Get the ArDrive owner nickname
export const promptForLogin = async () => {
  console.log('Please enter your ArDrive Login Name.  If no name exists, we will begin to setup a ArDrive Profile for you.');
  const login = prompt('  Login Name: ');
  return login;
};

// Get the ArDrive owner nickname
const promptForArDriveId = async (drives : ArFSDriveMetadata[], drivePrivacy: string) : Promise<ArFSDriveMetadata> => {
  console.log('Existing %s Drive IDs have been found for this ArDrive wallet.', drivePrivacy);
  console.log('Which one would you like to use as your default %s drive?', drivePrivacy)
  let i = 0;
  drives.forEach((drive: ArFSDriveMetadata) => {
    let createdOn = new Date(+drive.unixTime)
    console.log ('%s: %s', i, drive.driveName)
    console.log (' Created On: %s | Drive Id: %s', createdOn, drive.driveId);
    i += 1;
  });
  console.log('%s: Generate a new %s Drive ID', i, drivePrivacy);
  const choice = prompt('   Please select which number: ');
  if (+choice === i) {
    const driveName : string = prompt('   Please enter in a new name for this drive: ');
    if (drivePrivacy === 'public') {
      const newDrive = await createNewPublicDrive(driveName)
      drives.push (newDrive)
    }
    else if (drivePrivacy === 'private') {
      const newDrive = await createNewPrivateDrive(driveName)
      drives.push (newDrive)
    }
  }
  // NEED TO VALIDATE THIS RESPONSE, like if the user just hits enter
  return drives[choice];
};

// Get the ArDrive Sync Folder path
// Will handle error checking and ensuring it is a valid path
const promptForSyncFolderPath = (): string => {
  // Setup ArDrive Sync Folder
  console.log('Please enter the path of your local root ArDrive folder e.g D:\\ArDriveSync.');
  const syncFolderPath : Path = prompt('   ArDrive Sync Folder Path (hit enter for current directory): ');
  const validPath = checkOrCreateFolder(syncFolderPath);
  if (validPath === '0') {
    return promptForSyncFolderPath();
  }
  return syncFolderPath;
};

// Setup ArDrive Login Password
// Modify to check for password strength
const promptForNewLoginPassword = async () : Promise<string> => {
  let password = '';
  const newLoginPasswordResponse = await passwordPrompt({
    type: 'text',
    name: 'password',
    style: 'password',
    message: '  Please enter a strong ArDrive Login password: ',
  });
  const checkLoginPasswordResponse = await passwordPrompt({
    type: 'text',
    name: 'password',
    style: 'password',
    message: '  Please re-enter your strong ArDrive Login password: ',
  });

  // Lets check to ensure the passwords match
  if (newLoginPasswordResponse.password !== checkLoginPasswordResponse.password) {
    console.log("The passwords you have entered do not match!")
    password = await promptForNewLoginPassword()
  }
  else {
    password = newLoginPasswordResponse.password
  }
  return password;
};

// Prompts the user to enter a login password
const promptForLoginPassword = async () => {
  const loginPasswordResponse = await passwordPrompt({
    type: 'text',
    name: 'password',
    style: 'password',
    message: '  Please enter your ArDrive Login password: ',
  });
  return loginPasswordResponse.password;
};

// Collects all of the information needed to create a new user
// This includes Wallet, Existing ArDrives and Sync Folder Path
const promptForNewUserInfo = async (login: string) => {
  let wallet;
  const user: ArDriveUser = {
    login,
    dataProtectionKey: "",
    walletPrivateKey: "",
    walletPublicKey: "",
    syncFolderPath: "",
  }
  console.log ("");
  console.log ("                                          Welcome to ArDrive                                            ");
  console.log ("--------------------------------------------------------------------------------------------------------");
  console.log ("Your secure and private...                                                                              ");
  console.log ("                          censorship-resistant...                                                       ");
  console.log ("                                              pay-as-you-go...                                          ");
  console.log ("                                                              decentralized...                          ");
  console.log ("                                                                              and PERMANENT hard drive! ");
  console.log ("--------------------------------------------------------------------------------------------------------");
  console.log ("");
  console.log ("ArDrive is a simple, yet robust app that protects and syncs your data to and from the decentralized cloud.");
  console.log ("- No subscription needed!  Pay once to store your personal files, photos, videos and apps.");
  console.log ("        PERMANENTLY!")
  console.log ("- Your Private Drives are encrypted, so noone including the ArDrive community will ever be able to read your content.");
  console.log ("        ONLY YOU!")
  console.log ("- Your Public Drives are open for anyone on the internet to view or download, forever.");
  console.log ("        POST CAREFULLY!")
  console.log ("- Any data you upload is stored and secured on an immutable and decentralized blockchain network, powered by Arweave.");
  console.log ("        DELETING IS NOT AN OPTION!")
  console.log ("");

  try {

    // Get a strong password for login
    // TO DO - make password strong!!
    console.log('Your ArDrive Login password and Arweave Wallet will be combined to encrypt all your private data');
    console.log('        Do NOT share them!');
    console.log('        Do NOT lose them!');
    console.log('        Do NOT save them in public places!');
    console.log('        So please KEEP THEM SECRET and KEEP THEM SAFE!!!')
    const loginPassword : string = await promptForNewLoginPassword();
    console.log ("");

    // Get the user's wallet information
    console.log ('Your Arweave wallet is used to pay for all data you upload through ArDrive.');
    console.log ('Want to learn more?  Head to https://arweave.org');
    const existingWallet = promptForWallet();
    if (existingWallet.toLowerCase() === 'n') {
      wallet = await createArDriveWallet();
      const backupWalletPath : Path = promptForBackupWalletPath();
      await backupWallet(backupWalletPath, wallet, login);
    } else {
      const existingWalletPath : Path = promptForLocalWalletPath();
      wallet = await getLocalWallet(existingWalletPath);
    }
    // Set the wallet in the users profile
    user.walletPrivateKey = wallet.walletPrivateKey;
    user.walletPublicKey = wallet.walletPublicKey;
    console.log ("");

    // Get the local root folder that will contain all of the user's drives
    console.log ('Your ArDrive Sync Folder is the root directory for any of your Public, Private or Shared Drives.');
    user.syncFolderPath = promptForSyncFolderPath();
    console.log ('Using %s', user.syncFolderPath);

    // Load an existing default Private ArDrive
    console.log ("");
    console.log ("Let\'s get you ready to start syncing by setting up some Drives.");
    console.log ("Each Drive will be created under your ArDrive Sync Folder using its specified name.")
    console.log ("A new folder will be created if it doesn't exist e.g D:\\ArDriveSync\\MyDrive_Name");
    console.log ("");
    console.log ("Let's add a default Private Drive.")
    console.log ("Private Drives encrypt and protect all of your personal data, ensuring only you can access it.");

    const privateDrives = await getAllMyPrivateArDriveIds(wallet.walletPublicKey);
    if (privateDrives.length > 0) {
      const existingPrivateDrive : ArFSDriveMetadata = await promptForArDriveId(privateDrives, "private");
      await addDriveToDriveTable(existingPrivateDrive);
    } else {
      const driveName : string = prompt('   Please enter a name for your new Private drive: ');
      const newDrive = await createNewPrivateDrive(driveName)
      await addDriveToDriveTable(newDrive);
    }

    console.log ("");
    console.log ("Great!!");
    console.log ("");
    console.log ("Now let's add a default Public Drive");
    console.log ("Public Drives are open and read-only to the entire internet.  Anything uploaded here is accessable forever on the PermaWeb!")

    // Load an existing default Public ArDrive
    const publicDrives = await getAllMyPublicArDriveIds(wallet.walletPublicKey);
    if (publicDrives.length > 0) {
      const existingPublicDrive : ArFSDriveMetadata = await promptForArDriveId(publicDrives, "public");
      await addDriveToDriveTable(existingPublicDrive);
    } else {
      const driveName : string = prompt('   Please enter a name for your new Public drive: ');
      const newDrive = await createNewPublicDrive(driveName)
      await addDriveToDriveTable(newDrive);
    }

    // Set the data protection key used for all data encryption.
    // The key is based on the uesr's login
    user.dataProtectionKey = loginPassword;
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
  if (readyToUpload === 'Y')
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