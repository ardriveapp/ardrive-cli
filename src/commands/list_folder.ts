/* eslint-disable no-console */
import { cliArweave } from '..';
import { cliWalletDao, CLI_APP_NAME, CLI_APP_VERSION } from '..';
import { ArDrive, ArDriveAnonymous } from '../ardrive';
import {
	ArFSDAO,
	ArFSDAOAnonymous,
	ArFSPrivateFileOrFolderData,
	ArFSPublicFileOrFolderData,
	FolderHierarchy
} from '../arfsdao';
import { CLICommand } from '../CLICommand';
import { CommonContext } from '../CLICommand/common_context';
import { ArDriveCommunityOracle } from '../community/ardrive_community_oracle';
import {
	DrivePasswordParameter,
	ParentFolderIdParameter,
	SeedPhraseParameter,
	WalletFileParameter
} from '../parameter_declarations';

new CLICommand({
	name: 'list-folder',
	parameters: [ParentFolderIdParameter, SeedPhraseParameter, WalletFileParameter, DrivePasswordParameter],
	async action(options) {
		const context = new CommonContext(options, cliWalletDao);
		const wallet = await context.getWallet().catch(() => null);
		const password = context.getParameterValue(DrivePasswordParameter);
		const folderId = context.getParameterValue(ParentFolderIdParameter);
		let folder;
		let mergedData: (ArFSPrivateFileOrFolderData | ArFSPublicFileOrFolderData)[];

		if (!folderId) {
			console.log(`Folder id not specified! ${folderId}`);
			process.exit(1);
		}

		if (wallet && password) {
			const arDrive = new ArDrive(
				wallet,
				cliWalletDao,
				new ArFSDAO(wallet, cliArweave),
				new ArDriveCommunityOracle(cliArweave),
				CLI_APP_NAME,
				CLI_APP_VERSION
			);
			// Fetch the folder to extract the drive
			const folderBuilder = await arDrive.getPrivateFolderMetaData(folderId);
			const driveKey = await context.getDriveKey(folderBuilder.driveId!);
			folder = await folderBuilder.build(driveKey);

			// Fetch all of the folder entities within the drive
			const driveIdOfFolder = folder.driveId;
			const allFolderEntitiesOfDrive = await arDrive.getAllFoldersOfPrivateDrive(driveIdOfFolder, driveKey);

			// Feed entities to FolderHierarchy.setupNodesWithEntity()
			const hierarchy = FolderHierarchy.newFromEntities(allFolderEntitiesOfDrive);
			const folderIDs = hierarchy.allFolderIDs();

			// Fetch all file entities within all Folders of the drive
			const allFileEntitiesOfDrive = await arDrive.getPrivateChildrenFilesFromFolderIDs(folderIDs, password);

			// Fetch all names of each entity
			const allEntitiesOfDrive = [...allFolderEntitiesOfDrive, ...allFileEntitiesOfDrive].sort(
				(a, b) => +a.txId - +b.txId
			);

			mergedData = allEntitiesOfDrive.map((entity) => {
				const path = `${hierarchy.pathToFolderId(entity.parentFolderId)}/${entity.name}`;
				const txPath = `${hierarchy.txPathToFolderId(entity.parentFolderId)}/${entity.txId}`;
				const entityIdPath = `${hierarchy.entityPathToFolderId(entity.parentFolderId)}/${entity.entityId}`;
				return new ArFSPrivateFileOrFolderData(
					entity.appName,
					entity.appVersion,
					entity.arFS,
					entity.contentType,
					entity.driveId,
					entity.entityType,
					entity.name,
					entity.txId,
					entity.unixTime,
					entity.parentFolderId,
					entity.entityId,
					entity.cipher,
					entity.cipherIV,
					path,
					txPath,
					entityIdPath
				);
			});
		} else {
			const arDrive = new ArDriveAnonymous(new ArFSDAOAnonymous(cliArweave));
			folder = await arDrive.getPublicFolder(folderId);

			// Fetch all of the folder entities within the drive
			const driveIdOfFolder = folder.driveId;
			const allFolderEntitiesOfDrive = await arDrive.getAllFoldersOfPublicDrive(driveIdOfFolder);

			// Feed entities to FolderHierarchy.setupNodesWithEntity()
			const hierarchy = FolderHierarchy.newFromEntities(allFolderEntitiesOfDrive);
			const folderIDs = hierarchy.allFolderIDs();

			// Fetch all file entities within all Folders of the drive
			const allFileEntitiesOfDrive = await arDrive.getPublicChildrenFilesFromFolderIDs(folderIDs);

			// Fetch all names of each entity
			const allEntitiesOfDrive = [...allFolderEntitiesOfDrive, ...allFileEntitiesOfDrive].sort(
				(a, b) => +a.txId - +b.txId
			);

			mergedData = allEntitiesOfDrive.map((entity) => {
				const path = `${hierarchy.pathToFolderId(entity.parentFolderId)}/${entity.name}`;
				const txPath = `${hierarchy.txPathToFolderId(entity.parentFolderId)}/${entity.txId}`;
				const entityIdPath = `${hierarchy.entityPathToFolderId(entity.parentFolderId)}/${entity.entityId}`;
				return new ArFSPublicFileOrFolderData(
					entity.appName,
					entity.appVersion,
					entity.arFS,
					entity.contentType,
					entity.driveId,
					entity.entityType,
					entity.name,
					entity.txId,
					entity.unixTime,
					entity.parentFolderId,
					entity.entityId,
					path,
					txPath,
					entityIdPath
				);
			});
		}

		// Display data
		console.log(JSON.stringify(mergedData, null, 4));
		process.exit(0);
	}
});
