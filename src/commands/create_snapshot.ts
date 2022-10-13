import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	DryRunParameter,
	DrivePrivacyParameters,
	GatewayParameter,
	DriveIdParameter,
	CustomContentTypeParameter,
	DestinationFileNameParameter,
	ParentFolderIdParameter,
	ShouldBundleParameter
} from '../parameter_declarations';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import { constructSnapshotData, snapshotDataToBuffer } from '../utils/snapshots/create_snapshot';
import {
	ArDriveUploadStats,
	ArFSFileToUpload,
	DriveID,
	EID,
	FolderID,
	GatewayAPI,
	gatewayUrlForArweave,
	Wallet,
	wrapFileOrFolder
} from 'ardrive-core-js';
import { cliArDriveFactory, cliArweave } from '..';

import { GetSnapshotDataResult } from '../utils/snapshots/create_snapshot';
import { writeFileSync } from 'fs';
import { getTempFolder } from '../utils/temp_folder';
import { join as joinPath } from 'path';

new CLICommand({
	name: 'create-snapshot',
	parameters: [
		DriveIdParameter,
		CustomContentTypeParameter,
		DestinationFileNameParameter,
		ParentFolderIdParameter,
		ShouldBundleParameter,
		BoostParameter,
		DryRunParameter,
		...DrivePrivacyParameters,
		GatewayParameter
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);

		const isPrivate = await parameters.getIsPrivate();
		if (isPrivate) {
			throw new Error('Unimplemented!');
		}

		const wallet: Wallet = await parameters.getRequiredWallet();
		const driveId: DriveID = parameters.getRequiredParameterValue(DriveIdParameter, EID);
		const parentFolderId: FolderID = parameters.getRequiredParameterValue(ParentFolderIdParameter, EID);
		const shouldBundle = !!parameters.getParameterValue(ShouldBundleParameter);

		const gatewayApi = new GatewayAPI({ gatewayUrl: gatewayUrlForArweave(cliArweave) });

		const owner = await wallet.getAddress();
		const result = await constructSnapshotData({
			owner,
			driveId,
			gatewayApi
		});

		// const arfsTagSettings = new ArFSTagSettings({});
		// const arFSTagAssembler = new ArFSTagAssembler(arfsTagSettings);
		// const txPreparer = new TxPreparer({ arweave: cliArweave, wallet: wallet as JWKWallet, arFSTagAssembler });
		// const rewardSettings = new RewardSettings();

		const uploadStats: ArDriveUploadStats[] = [
			await prepareSnapshotFileToUpload({ snapshot: result, parentFolderId, parameters })
		];

		const ardrive = cliArDriveFactory({
			wallet,
			feeMultiple: parameters.getOptionalBoostSetting(),
			dryRun: parameters.isDryRun(),
			shouldBundle,
			arweave: cliArweave
		});
		const uploadResult = await ardrive.uploadAllEntities({
			entitiesToUpload: uploadStats,
			conflictResolution: 'replace'
		});

		// await postSnapshot({ snapshot: result, gatewayApi, txPreparer, rewardSettings });

		// console.log(JSON.stringify(result, null, 4));
		console.log(JSON.stringify(uploadResult, null, 4));

		return SUCCESS_EXIT_CODE;
	})
});

async function prepareSnapshotFileToUpload({
	snapshot,
	parentFolderId,
	parameters
}: PrepareSnapshotFileToUploadParams): Promise<ArDriveUploadStats> {
	const data = snapshotDataToBuffer(snapshot.data);
	const range = snapshot.range.rangeSegments[0]!;
	const tempFolder = getTempFolder();
	const temporaryFileName = `snapshot_${range.start}-${range.end}`;
	const temporaryFilePath = joinPath(tempFolder, temporaryFileName);

	const customContentType = parameters.getParameterValue(CustomContentTypeParameter);
	const destinationFileName = parameters.getParameterValue(DestinationFileNameParameter);

	writeFileSync(temporaryFilePath, data);

	const customMetadata = {
		dataGqlTags: {
			'Block-Start': `${range.start}`,
			'Block-End': `${range.end}`
		}
	};
	const wrappedEntity = wrapFileOrFolder(temporaryFilePath, customContentType, customMetadata) as ArFSFileToUpload;

	return { destFolderId: parentFolderId, wrappedEntity, destName: destinationFileName };
}

interface PrepareSnapshotFileToUploadParams {
	snapshot: GetSnapshotDataResult;
	parentFolderId: FolderID;
	parameters: ParametersHelper;
}
