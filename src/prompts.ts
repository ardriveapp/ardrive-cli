import {
  getLocalWallet,
  createArDriveWallet,
  checkOrCreateFolder,
  backupWallet,
  checkFileExistsSync,
  addDriveToDriveTable,
  createNewPublicDrive,
  createNewPrivateDrive,
  addSharedPublicDrive,
  deleteDrive,
  sanitizePath,
} from 'ardrive-core-js';
import { getAllDrivesByLoginFromDriveTable, getAllUnSyncedPersonalDrivesByLoginFromDriveTable, getProfileWalletBalance, setDriveToSync } from 'ardrive-core-js/lib/db';
import { getAllMyPersonalDrives } from 'ardrive-core-js/lib/download';
import { ArDriveUser, ArFSDriveMetaData, UploadBatch } from 'ardrive-core-js/lib/types';

const prompt = require ('prompt-sync')({sigint: true});
import passwordPrompt from 'prompts';
import { Path } from 'typescript';

// Get the users wallet or create a new one
const promptForWallet = () : string => {
  // Create new or import Arweave wallet
  const existingWallet: string = prompt(
    '   Do you have an existing Arweave Wallet .json file? (default is Yes) Y/N '
  );
  return existingWallet;
};

// Get path to local wallet and return that wallet public and private key
const promptForLocalWalletPath = () : string => {
  console.log('Please enter the path of your existing Arweave Wallet JSON file eg. C:\\Source\\ardrive_test_key.json');
  const existingWalletPath : string = prompt('   Wallet Path: ');

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
const promptForBackupWalletPath = () : string => {
  console.log(
    'Please enter the path to backup your new ArDrive Wallet e.g C:\\My_Safe_Location'
  );
  const backupFolderPath : string = prompt('   ArDrive Wallet Backup Folder Path (hit enter for current directory): ');
  const validPath : string = checkOrCreateFolder(backupFolderPath);
  if (validPath === '0') {
    return promptForBackupWalletPath();
  }
  return backupFolderPath;
};

// Get the ArDrive owner nickname
export const promptForLogin = async () : Promise<string> => {
  console.log('Please enter your ArDrive Login Name.  If no name exists, we will begin to setup a ArDrive Profile for you.');
  const login = prompt('  Login Name: ');
  if (login === '') {
    console.log ('    Invalid entry!')
    return await promptForLogin()
  }
  return login;
};

export const promptForAutoSyncApproval = async () : Promise<number> => {
  const autoSyncApproval : string = prompt ('  Would you like to automatically approve the fees for all uploads to Arweave? (Default is No) Y/N ');
  if (autoSyncApproval.toUpperCase() === 'Y') {
    console.log ("  Data will be uploaded without fee approval.")
    return 1; // enable autoSyncApproval
  }
  else {
    return 0; // disable autoSyncApproval
  }
}

// Asks the user to delete a Drive.  If the drive ID is invalid the user will get prompted again
export const promptToRemoveDrive = async (login: string) : Promise<string> => {
  const driveRemoval : string = prompt ('  Would you like to remove a locally synced Public, Private or Shared Drive? (Default is No) Y/N ');
  if (driveRemoval.toUpperCase() === 'Y') {
    console.log ("  Please select the local drive you would like to stop synchronizing and remove.");
    let i = 0;
    const drives : ArFSDriveMetaData[] = await getAllDrivesByLoginFromDriveTable(login);
    drives.forEach((drive: ArFSDriveMetaData) => {
      let createdOn = new Date(+drive.unixTime * 1000);
      console.log ('%s: %s', i, drive.driveName)
      console.log ('   %s | %s | Created On: %s | Drive Id: %s', drive.driveSharing, drive.drivePrivacy, createdOn, drive.driveId);
      i += 1;
    })
    const choice = prompt('   Please select which number: ');
    if (+choice <= i) {
      console.log ("Deleting drive %s", drives[choice].driveName);
      await deleteDrive(drives[choice].driveId);
      return "Deleted";
    } else {
      console.log ("Invalid Drive selection");
      return "Invalid";
    }
  }
  return "Skipped";
}

// Asks the user to add a Public Drive ID.  If the drive ID is invalid, the user will get prompted again
export const promptToAddSharedPublicDrive = async (user: ArDriveUser) : Promise<string> => {
  const newDrive : string = prompt ('  Would you like to add a Public Shared Drive? (default is No) Y/N ');
  if (newDrive.toUpperCase() === 'Y') {
    console.log ('  Please enter the Drive Id you would like to add eg. jfj70d03-2353-4bb4-8606-d9db1c40772z')
    const driveId : string = prompt ('  Drive Id: ')
    const result : string = await addSharedPublicDrive(user, driveId)
    // If it is an invalid drive id, we will reprompt
    if (result === 'Invalid') {
      console.log ("    The Drive Id, %s, cannot be found", driveId);
      return await promptToAddSharedPublicDrive(user);
    } else {
      console.log ("Added Drive %s!", result)
      return 'Added'
    }
  }
  else {
    return 'Skipped'
  }
}

// Asks the user if they want to add or create a new personal private drive
export const promptToAddOrCreatePersonalPrivateDrive = async (user: ArDriveUser) : Promise<string> => {
  const newDrive : string = prompt ('  Would you like to add a Private Personal Drive? (default is No) Y/N ');
  if (newDrive.toUpperCase() === 'Y') {
  const privateDrives = await getAllUnSyncedPersonalDrivesByLoginFromDriveTable(user.login, "private");
    if (privateDrives.length > 0) {
      const existingPrivateDrive : ArFSDriveMetaData = await promptForArDriveId(user.login, privateDrives, "private");
      await setDriveToSync(existingPrivateDrive.driveId);
      return 'Added Drive'
    } else {
      let driveName : string = prompt('   Please enter a name for your new private drive: ');
      driveName = await sanitizePath(driveName)
      if (driveName !== '') {
        const newDrive = await createNewPrivateDrive(user.login, driveName)
        await addDriveToDriveTable(newDrive);
        return 'Created Drive'
      } else {
        console.log ("    Invalid drive name!")
        return await promptToAddOrCreatePersonalPrivateDrive(user);
      }
    }
  }
  return 'None Added'
}

// Asks the user if they want to add or create a new personal private drive
export const promptToAddOrCreatePersonalPublicDrive = async (user: ArDriveUser) : Promise<string> => {
  const newDrive : string = prompt ('  Would you like to add a Public Personal Drive? (default is No) Y/N ');
  if (newDrive.toUpperCase() === 'Y') {
      // Load an existing default Public ArDrive
      const publicDrives = await getAllUnSyncedPersonalDrivesByLoginFromDriveTable(user.login, "public");
      if (publicDrives.length > 0) {
        const existingPublicDrive : ArFSDriveMetaData = await promptForArDriveId(user.login, publicDrives, "public");
        await addDriveToDriveTable(existingPublicDrive);
        await setDriveToSync(existingPublicDrive.driveId);
        return 'Added Drive'
      } else {
        let driveName : string = prompt('   Please enter a name for your new public drive: ');
        driveName = await sanitizePath(driveName);
        if (driveName !== '') {
          const newDrive = await createNewPublicDrive(user.login, driveName)
          await addDriveToDriveTable(newDrive);
          return 'Created Drive'
        } else {
          console.log ("    Invalid drive name!")
          return await promptToAddOrCreatePersonalPrivateDrive(user);
        }
      }
  }
  return 'None Added'
}

// Ask the user which public or private drive they should use.
const promptForArDriveId = async (login: string, drives : ArFSDriveMetaData[], drivePrivacy: string) : Promise<ArFSDriveMetaData> => {
  console.log('Existing %s Drive IDs have been found for your Arweave wallet.', drivePrivacy);
  console.log('Either pick an existing %s Drive or create a new one', drivePrivacy)
  let i = 0;
  drives.forEach((drive: ArFSDriveMetaData) => {
    let createdOn = new Date(+drive.unixTime * 1000)
    console.log ('%s: %s', i, drive.driveName)
    console.log (' Created On: %s | Drive Id: %s', createdOn, drive.driveId);
    i += 1;
  })
  console.log('%s: Create a new %s Drive', i, drivePrivacy);
  const choice = prompt('   Please select which number: ');
  if (+choice === i) {
    let driveName : string = prompt('   Please enter in a new name for your new drive: ');
    driveName = await sanitizePath(driveName);
    console.log ("Drive name is ", driveName)
    if (driveName === '') {
      console.log ("    Invalid drive name!")
      return await promptForArDriveId(login, drives, drivePrivacy)
    }
    if (drivePrivacy === 'public') {
      const newDrive = await createNewPublicDrive(login, driveName)
      drives.push (newDrive)
    }
    else if (drivePrivacy === 'private') {
      const newDrive = await createNewPrivateDrive(login, driveName)
      drives.push (newDrive)
    }
    drives[choice].login = login;
    return drives[choice];
  }
  else if ((+choice < i) && (+choice >= 0) && (choice !== '')) {
    try {
      drives[choice].login = login;
      return drives[choice];
    }
    catch (err) {
      console.log ("    Invalid selection!")
      return await promptForArDriveId(login, drives, drivePrivacy)
    }
  }
  else {
    console.log ("    Invalid selection!")
    return await promptForArDriveId(login, drives, drivePrivacy)
  }
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
  console.log('Strong passwords should have at least 15 characters, with upper/lower case letters, numbers and symbols.')
  console.log('This password can NOT be changed, so choose it wisely and store it carefully.')
  const newLoginPasswordResponse = await passwordPrompt({
    type: 'text',
    name: 'password',
    style: 'password',
    message: '  Please enter your strong ArDrive Login password:',
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
const promptForLoginPassword = async () : Promise<string> => {
  const loginPasswordResponse = await passwordPrompt({
    type: 'text',
    name: 'password',
    style: 'password',
    message: '  Please enter your ArDrive Login password: ',
  });
  if (loginPasswordResponse.password === '') {
    console.log ("    Invalid password entered!");
    return await promptForLoginPassword();
  }
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
    autoSyncApproval: 0,
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
  console.log ("");
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
    console.log('Your Arweave Wallet and ArDrive Login password will be combined to encrypt all your private data');
    console.log('        Do NOT share them!');
    console.log('        Do NOT lose them!');
    console.log('        Do NOT save them in public places!');
    console.log('        So please KEEP THEM SECRET and KEEP THEM SAFE!!!')
    console.log("")

    // Get the user's wallet information
    console.log ('Your Arweave wallet is used to pay for all data you upload through ArDrive.');
    console.log ('Want to learn more?  Head to https://arweave.org');
    const existingWallet = promptForWallet();
    if (existingWallet.toLowerCase() === 'n') {
      wallet = await createArDriveWallet();
      const backupWalletPath : string = promptForBackupWalletPath();
      await backupWallet(backupWalletPath, wallet, login);
    } else {
      const existingWalletPath : string = promptForLocalWalletPath();
      wallet = await getLocalWallet(existingWalletPath);
    }
    // Set the wallet in the users profile
    user.walletPrivateKey = JSON.stringify(wallet.walletPrivateKey);
    user.walletPublicKey = wallet.walletPublicKey;
    console.log ("");

    // Get strong login password
    console.log("Already set up some Private Drives with this wallet??  Please reuse that password here to unlock them.")
    const loginPassword : string = await promptForNewLoginPassword();
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
    console.log ("Private Drives encrypt and protect all of your personal data, ensuring only you can read and write to it.");

    // Set the data protection key used for all data encryption.
    // The key is based on the uesr's login
    user.dataProtectionKey = loginPassword;

    // Sync all of the Drives that a user has created
    await getAllMyPersonalDrives(user)

    await promptToAddOrCreatePersonalPrivateDrive(user);

    console.log ("");
    console.log ("Public Drives are open and read-only to the entire internet.  Anything uploaded here is accessable forever on the PermaWeb!")

    await promptToAddOrCreatePersonalPublicDrive(user);

    console.log ("")
    console.log ("Shared Public Drives can also be added, allowing you to download (but not upload) someone else's Public Drive")
    await promptToAddSharedPublicDrive(user);

    console.log ("")
    console.log ("All data uploads are paid with the native Arweave token (AR)")
    user.autoSyncApproval = await promptForAutoSyncApproval()

    return user;
  } catch (err) {
    console.log(err);
    return user;
  }
};

// Asks the user to approve an upload to Arweave
const promptForArDriveUpload = async (login: string, uploadBatch: UploadBatch, autoSyncApproval: number) : Promise<boolean> => {
  console.log(
    'Uploading %s files, %s folders and %s changes (%s) to the Permaweb, totaling %s AR',
    uploadBatch.totalNumberOfFileUploads,
    uploadBatch.totalNumberOfFolderUploads,
    uploadBatch.totalNumberOfMetaDataUploads,
    uploadBatch.totalSize,
    uploadBatch.totalArDrivePrice
  );
  // Ensure the user has enough AR to pay for this upload.  If not, do not proceed.
  const profile = await getProfileWalletBalance(login);
  if (profile.walletBalance >= uploadBatch.totalArDrivePrice) {
    if (autoSyncApproval) {
      return true;
    }
    const readyToUpload = prompt('Upload all unsynced files? Y/N ');
    if (readyToUpload.toUpperCase() === 'Y') {
      return true;
    } else {
      // User selects NO so we do not upload
      return false;
    }
  } else {
    // Not enough AR to upload
    console.log ("Oops!  You do not have enough AR to upload! Your balance is %s AR.", profile.walletBalance);
    console.log ("Please remove your recent files, or add more AR to your wallet and try again.")
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