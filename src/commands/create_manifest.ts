import { EID } from 'ardrive-core-js';
import { cliArDriveFactory, cliWalletDao } from '..';
import { CLICommand, ParametersHelper } from '../CLICommand';
import { CLIAction } from '../CLICommand/action';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import {
	BoostParameter,
	FolderIdParameter,
	DryRunParameter,
	SeedPhraseParameter,
	TreeDepthParams,
	WalletFileParameter,
	DestinationManifestNameParameter,
	ConflictResolutionParams,
	GatewayParameter,
	ShouldTurboParameter,
	TurboUrlParameter
} from '../parameter_declarations';
import { fileUploadConflictPrompts } from '../prompts';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

new CLICommand({
	name: 'create-manifest',
	parameters: [
		FolderIdParameter,
		DestinationManifestNameParameter,
		BoostParameter,
		DryRunParameter,
		WalletFileParameter,
		SeedPhraseParameter,
		...ConflictResolutionParams,
		...TreeDepthParams,
		GatewayParameter,
		ShouldTurboParameter,
		TurboUrlParameter
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options, cliWalletDao);

		const wallet = await parameters.getRequiredWallet();
		const arweave = getArweaveFromURL(parameters.getGateway());
		const useTurbo = !!parameters.getParameterValue(ShouldTurboParameter);
		const turboUrl = parameters.getTurbo();

		const arDrive = cliArDriveFactory({
			wallet: wallet,
			feeMultiple: parameters.getOptionalBoostSetting(),
			dryRun: parameters.isDryRun(),
			arweave,
			turboSettings: useTurbo
				? {
						turboUploadUrl: turboUrl,
						turboPaymentUrl: new URL(turboUrl.toString().replace('upload', 'payment')),
						isDryRun: parameters.isDryRun()
				  }
				: undefined
		});

		const folderId = parameters.getRequiredParameterValue(FolderIdParameter, EID);

		const maxDepth = await parameters.getMaxDepth(Number.MAX_SAFE_INTEGER);
		const destManifestName = parameters.getParameterValue(DestinationManifestNameParameter);
		const conflictResolution = parameters.getFileNameConflictResolution();

		const result = await arDrive.uploadPublicManifest({
			folderId: folderId,
			maxDepth,
			destManifestName,
			conflictResolution,
			prompts: fileUploadConflictPrompts
		});

		console.log(JSON.stringify(result, null, 4));

		return SUCCESS_EXIT_CODE;
	})
});
