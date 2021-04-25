// import {
// 	addNewUser,
// 	ArDriveUser,
// 	backupWallet,
// 	checkFileExistsSync,
// 	checkOrCreateFolder,
// 	createArDriveWallet,
// 	getAllMyPersonalDrives,
// 	getLocalWallet,
// 	getUser,
// 	passwordCheck,
// 	setProfileAutoSyncApproval,
// 	updateUserSyncFolderPath
// } from 'ardrive-core-js';
// import { Wallet } from 'ardrive-core-js/lib/types';
// import { MAX_ATTEMPTS, TOO_MANY_ATTEMPTS_ERROR } from '../common';
// import {
// 	promptForAutoSyncApproval,
// 	promptForLoginPassword,
// 	promptToAddOrCreatePersonalPrivateDrive,
// 	promptToAddOrCreatePersonalPublicDrive,
// 	promptToAddSharedPublicDrive,
// 	promptToChangeSyncFolderPath,
// 	promptToRemoveDrive
// } from '../prompts';
// import { promptPasswordConfirm, promptPath, promptYesNo } from './prompters';

// export async function createNewUser(username: string): Promise<ArDriveUser> {
// 	// Welcome message and info
// 	console.log("We have not detected a profile for your login!  Let's get one set up.");
// 	let user: ArDriveUser = {
// 		login: username,
// 		dataProtectionKey: '',
// 		walletPrivateKey: '',
// 		walletPublicKey: '',
// 		syncFolderPath: '',
// 		autoSyncApproval: 0
// 	};
// 	console.log(
// 		'\
//                                           Welcome to ArDrive                                            \
// --------------------------------------------------------------------------------------------------------\
// Your secure and private...                                                                              \
//                           censorship-resistant...                                                       \
//                                               pay-as-you-go...                                          \
//                                                               decentralized...                          \
//                                                                               and PERMANENT hard drive! \
// --------------------------------------------------------------------------------------------------------\
// \
// ArDrive is a simple, yet robust app that protects and syncs your data to and from the decentralized cloud.\
// \
// - No subscription needed!  Pay once to store your personal files, photos, videos and apps.\
//         PERMANENTLY!\
// - Your Private Drives are encrypted, so noone including the ArDrive community will ever be able to read your content.\
//         ONLY YOU!\
// - Your Public Drives are open for anyone on the internet to view or download, forever.\
//         POST CAREFULLY!\
// - Any data you upload is stored and secured on an immutable and decentralized blockchain network, powered by Arweave.\
//         DELETING IS NOT AN OPTION!\
// \
// Your Arweave Wallet and ArDrive Login password will be combined to encrypt all your private data\
//         Do NOT share them!\
//         Do NOT lose them!\
//         Do NOT save them in public places!\
//         So please KEEP THEM SECRET and KEEP THEM SAFE!!!\
// \
// Your Arweave wallet is used to pay for all data you upload through ArDrive.\
// Want to learn more?  Head to https://arweave.org'
// 	);
// 	const haveWallet = await promptYesNo('   Do you have an existing Arweave Wallet .json file?');
// 	const wallet = haveWallet ? await setupExistingWalelt() : await createAndBackupWallet(username);

// 	user.walletPrivateKey = JSON.stringify(wallet.walletPrivateKey);
// 	user.walletPublicKey = wallet.walletPublicKey;

// 	// Get strong login password
// 	console.log(
// 		'\
// Already set up some Private Drives with this wallet??  Please reuse that password here to unlock them.\
// Strong passwords should have at least 15 characters, with upper/lower case letters, numbers and symbols.'
// 	);
// 	const loginPassword: string = await promptPasswordConfirm(
// 		'  Please enter your strong ArDrive Login password: ',
// 		'  Please re-enter your strong ArDrive Login password: ',
// 		{ min: 8, max: 64 }
// 	);
// 	console.log('');

// 	// Get the local root folder that will contain all of the user's drives
// 	console.log('Your ArDrive Sync Folder is the root directory for any of your Public, Private or Shared Drives.');
// 	console.log('Please enter the path of your local root ArDrive folder e.g D:\\ArDriveSync.');
// 	const syncFolderPath = await promptDirectory(
// 		'   ArDrive Sync Folder Path (hit enter for current directory): ',
// 		'Not a valid directory, try again...'
// 	);

// 	user.syncFolderPath = syncFolderPath;
// 	console.log('Using %s', user.syncFolderPath);

// 	// Load an existing default Private ArDrive
// 	console.log('');
// 	console.log("Let's get you ready to start syncing by setting up some Drives.");
// 	console.log('Each Drive will be created under your ArDrive Sync Folder using its specified name.');
// 	console.log("A new folder will be created if it doesn't exist e.g D:\\ArDriveSync\\MyDrive_Name");

// 	// Set the data protection key used for all data encryption.
// 	// The key is based on the uesr's login
// 	user.dataProtectionKey = loginPassword;
// 	user.walletPrivateKey = JSON.stringify(wallet.walletPrivateKey);

// 	// Sync all of the Drives that a user has created
// 	await getAllMyPersonalDrives(user);

// 	console.log('');
// 	console.log(
// 		'Private Drives encrypt and protect all of your personal data, ensuring only you can read and write to it.'
// 	);
// 	await promptToAddOrCreatePersonalPrivateDrive(user);

// 	console.log('');
// 	console.log(
// 		'Public Drives are open and read-only to the entire internet.  Anything uploaded here is accessable forever on the PermaWeb!'
// 	);
// 	await promptToAddOrCreatePersonalPublicDrive(user);

// 	console.log('');
// 	console.log(
// 		"Shared Public Drives can also be added, allowing you to download (but not upload) someone else's Public Drive"
// 	);
// 	await promptToAddSharedPublicDrive(user);

// 	console.log('');
// 	console.log('All data uploads are paid with the native Arweave token (AR)');
// 	user.autoSyncApproval = await promptForAutoSyncApproval();

// 	await addNewUser(user.dataProtectionKey, user);
// 	user = await getUser(loginPassword, username);
// 	return user;
// }

// async function createAndBackupWallet(username: string): Promise<Wallet> {
// 	const wallet = await createArDriveWallet();
// 	console.log('Please enter the path to backup your new ArDrive Wallet e.g C:\\My_Safe_Location');
// 	const backupWalletPath: string = await promptPath(
// 		'   ArDrive Wallet Backup Folder Path (hit enter for current directory): '
// 	);
// 	await backupWallet(backupWalletPath, wallet, username);
// 	return wallet;
// }

// async function setupExistingWalelt(): Promise<Wallet> {
// 	console.log(
// 		'Please enter the path of your existing Arweave Wallet JSON file eg. C:\\Source\\ardrive_test_key.json'
// 	);
// 	const existingWalletPath: string = await promptPath('   Wallet Path: ', {
// 		validate: (path: string) => checkFileExistsSync(path) || 'File path is invalid!'
// 	});
// 	const wallet = getLocalWallet(existingWalletPath);
// 	return wallet;
// }

// async function promptDirectory(message: string, errorMessage: string): Promise<string> {
// 	for (let count = 0; count < MAX_ATTEMPTS; count++) {
// 		const path = await promptPath(message);
// 		const isValidDirectory = checkOrCreateFolder(path) !== '0';
// 		if (isValidDirectory) {
// 			return path;
// 		} else {
// 			console.log(errorMessage);
// 		}
// 	}
// 	throw TOO_MANY_ATTEMPTS_ERROR;
// }

// export async function loginUser(username: string): Promise<ArDriveUser | null> {
// 	// Allow the user to login
// 	console.log('You already have an existing ArDrive', username);
// 	const loginPassword = await promptForLoginPassword();
// 	const passwordResult: boolean = await passwordCheck(loginPassword, username);
// 	let user: ArDriveUser;
// 	if (passwordResult) {
// 		user = await getUser(loginPassword, username);
// 		console.log('Before we get syncing...');

// 		// Allow the user to add other drives
// 		await promptToAddOrCreatePersonalPrivateDrive(user);
// 		await promptToAddOrCreatePersonalPublicDrive(user);
// 		await promptToAddSharedPublicDrive(user);

// 		// Allow the user to change sync location
// 		const newSyncFolderPath: string = await promptToChangeSyncFolderPath(user.syncFolderPath);
// 		if (newSyncFolderPath != 'Skipped') {
// 			console.log('Updating to new sync folder path ', newSyncFolderPath);
// 			const result = await updateUserSyncFolderPath(user.login, newSyncFolderPath);
// 			if (result === 'Success') {
// 				console.log('Successfully moved Sync folder path to %s', newSyncFolderPath);

// 				// Update current user object
// 				user.syncFolderPath = newSyncFolderPath;
// 			} else {
// 				console.log('Error moving Sync folder path.  Continuing to use %s', user.syncFolderPath);
// 			}
// 		}

// 		// Allow the user to remove a shared, public or private drive
// 		await promptToRemoveDrive(user.login);

// 		// Allow the user to change the auto approve setting
// 		user.autoSyncApproval = await promptForAutoSyncApproval();
// 		await setProfileAutoSyncApproval(user.autoSyncApproval, user.login);
// 	} else {
// 		return null;
// 	}
// 	return user;
// }
