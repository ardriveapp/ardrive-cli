import { EID } from 'ardrive-core-js';
import { cliArDriveFactory, cliWalletDao } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import {
	BoostParameter,
	FolderIdParameter,
	DriveIdParameter,
	DryRunParameter,
	SeedPhraseParameter,
	TreeDepthParams,
	WalletFileParameter,
	DestinationManifestNameParameter
} from '../parameter_declarations';

new CLICommand({
	name: 'create-manifest',
	parameters: [
		DriveIdParameter,
		FolderIdParameter,
		DestinationManifestNameParameter,
		BoostParameter,
		DryRunParameter,
		WalletFileParameter,
		SeedPhraseParameter,
		...TreeDepthParams
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options, cliWalletDao);

		const wallet = await parameters.getRequiredWallet();

		const arDrive = cliArDriveFactory({
			wallet: wallet,
			feeMultiple: parameters.getOptionalBoostSetting(),
			dryRun: !!options.dryRun
		});

		// User can specify either a drive ID or a folder ID
		const driveId = parameters.getParameterValue(DriveIdParameter);
		const folderId = parameters.getParameterValue(FolderIdParameter);

		if (driveId && folderId) {
			throw new Error('Drive ID cannot be used in conjunction with folder ID!');
		}

		if (!driveId && !folderId) {
			throw new Error('Must provide either a drive ID or a folder ID to!');
		}

		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);
		const destManifestName = parameters.getParameterValue(DestinationManifestNameParameter);

		// TODO: Private manifests 🤔
		const result = await arDrive.uploadPublicManifest({
			driveId: driveId ? EID(driveId) : undefined,
			folderId: folderId ? EID(folderId) : undefined,
			maxDepth,
			destManifestName
		});

		console.log(JSON.stringify(result, null, 4));

		return SUCCESS_EXIT_CODE;
	})
});
