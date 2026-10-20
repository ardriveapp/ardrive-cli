import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	DriveIdParameter,
	DrivePrivacyParameters,
	DryRunParameter,
	GatewayParameter,
	SeedPhraseParameter,
	ShouldTurboParameter,
	TurboUrlParameter,
	WalletFileParameter
} from '../parameter_declarations';
import { SUCCESS_EXIT_CODE } from '../CLICommand/error_codes';
import { CLIAction } from '../CLICommand/action';
import {
	AR,
	ArFSDAO,
	BuiltDriveState,
	ByteCount,
	DriveStateBuildRefused,
	EID,
	GatewayAPI,
	GatewayOracle,
	gatewayUrlForArweave,
	RewardSettings,
	Wallet,
	WalletDAO
} from 'ardrive-core-js';
import { ArFSTagSettings } from 'ardrive-core-js/lib/arfs/arfs_tag_settings';
// Not part of the public `exports.ts` surface (same as ArFSTagSettings above) -- deep-imported
// directly from their source modules, mirroring the existing pattern in `src/index.ts`.
import { ARDataPriceNetworkEstimator } from 'ardrive-core-js/lib/pricing/ar_data_price_network_estimator';
import { Turbo } from 'ardrive-core-js/lib/arfs/turbo';
import { CLI_APP_NAME, CLI_APP_VERSION, cliArDriveFactory, cliWalletDao } from '..';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';

/**
 * Publishes a drive's snapshot: an ArFS Drive State entity, one SQLite file of
 * the drive's whole state up to the current block, sealed under the drive key
 * for a private drive. Clients read it instead of replaying the drive's history.
 */
new CLICommand({
	name: 'create-snapshot',
	parameters: [
		{
			name: DriveIdParameter,
			required: true,
			description: `the ArFS entity ID of the drive to snapshot. You must own it
\t\t\t\t\t\t\t• For a private drive, also pass --private or --drive-key`
		},
		...DrivePrivacyParameters,
		BoostParameter,
		DryRunParameter,
		WalletFileParameter,
		SeedPhraseParameter,
		GatewayParameter,
		ShouldTurboParameter,
		TurboUrlParameter
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options, cliWalletDao);

		const driveId = parameters.getRequiredParameterValue(DriveIdParameter, EID);
		const dryRun = parameters.isDryRun();
		const boost = parameters.getOptionalBoostSetting();
		const useTurbo = !!parameters.getParameterValue(ShouldTurboParameter);
		const turboUrl = parameters.getTurbo();

		const arweave = getArweaveFromURL(parameters.getGateway());
		const wallet: Wallet = await parameters.getRequiredWallet();
		const owner = await wallet.getAddress();
		const arDrive = cliArDriveFactory({ wallet, arweave, dryRun });

		// Only the drive's owner can publish its state: readers trust nothing else.
		const driveOwner = await arDrive.getOwnerForDriveId(driveId);
		if (`${driveOwner}` !== `${owner}`) {
			throw new Error(`Drive ${driveId} is owned by ${driveOwner}; only its owner can create a snapshot of it.`);
		}

		// A single GatewayAPI instance is shared by the drive's history queries AND the DAO that
		// posts the result, so both honor the same --gateway selection.
		const gatewayApi = new GatewayAPI({ gatewayUrl: gatewayUrlForArweave(arweave) });
		const arFSTagSettings = new ArFSTagSettings({ appName: CLI_APP_NAME, appVersion: CLI_APP_VERSION });
		const arFsDao = new ArFSDAO(
			wallet,
			arweave,
			dryRun,
			CLI_APP_NAME,
			CLI_APP_VERSION,
			arFSTagSettings,
			undefined,
			gatewayApi
		);

		const producer = `${CLI_APP_NAME}/${CLI_APP_VERSION}`;
		const log = (line: string) => console.error(line);
		const isPrivate = await parameters.getIsPrivate();

		let built: BuiltDriveState;
		try {
			if (isPrivate) {
				const driveKey = await parameters.getDriveKey({ driveId, arDrive, owner });
				// Proves the key before anything is built: a wrong key would otherwise read as
				// every entity in the drive being unreadable.
				await arDrive.getPrivateDrive({ driveId, driveKey, owner });
				built = await arFsDao.buildPrivateDriveState({ driveId, driveKey, owner, producer, log });
			} else {
				built = await arFsDao.buildPublicDriveState({ driveId, owner, producer, log });
			}
		} catch (e) {
			if (e instanceof DriveStateBuildRefused) {
				throw new Error(`Cannot create a snapshot of drive ${driveId} (${e.reason}): ${e.detail}`);
			}
			throw e;
		}

		const sealedBytes = built.sealed.body.byteLength;
		console.error(
			`Snapshotting ${built.entityCount} entities of drive '${driveId}' through block ${built.blockEnd} ` +
				`(${built.plaintextBytes} bytes, ${sealedBytes} sealed)...`
		);
		if (built.dropped.length > 0) {
			console.error(
				`Left out ${built.dropped.length} metadata transaction(s) missing a required field, as ArDrive does.`
			);
		}

		const tag = (name: string) => built.tags.find((t) => t.name === name)?.value;
		const summary = {
			driveStateId: tag('Drive-State-Id'),
			driveId: `${driveId}`,
			stateVersion: tag('State-Version'),
			blockStart: 0,
			blockEnd: built.blockEnd,
			entityCount: built.entityCount,
			unconfirmedDataTxs: built.unconfirmedDataTxs,
			plaintextBytes: built.plaintextBytes,
			sealedBytes,
			encrypted: isPrivate
		};

		if (useTurbo) {
			const dataItem = await arFsDao.prepareDriveStateDataItem(built);

			let turboResult: Awaited<ReturnType<Turbo['sendDataItem']>> | undefined;
			if (!dryRun) {
				const turbo = new Turbo({ turboUploadUrl: turboUrl, isDryRun: dryRun });
				console.error(`Uploading snapshot data item '${dataItem.id}' to Turbo...`);
				turboResult = await turbo.sendDataItem(dataItem);
			} else {
				console.error(`DRY RUN: would upload snapshot data item '${dataItem.id}' to Turbo`);
			}

			console.log(
				JSON.stringify(
					{ ...summary, txId: dataItem.id, transport: 'turbo', turbo: turboResult, dryRun, posted: !dryRun },
					null,
					4
				)
			);
			return SUCCESS_EXIT_CODE;
		}

		// AR (layer 1): estimate the cost, then require the wallet to hold it before signing.
		const priceEstimator = new ARDataPriceNetworkEstimator(new GatewayOracle(gatewayUrlForArweave(arweave)));
		const baseReward = await priceEstimator.getBaseWinstonPriceForByteCount(new ByteCount(sealedBytes));
		const boostedReward = boost?.wouldBoostReward() ? boost.boostedWinstonReward(baseReward) : baseReward;

		console.error(`Estimated cost: ${new AR(boostedReward).toString()} AR (${boostedReward.toString()} Winston)`);

		// A dry run spends nothing, so it does not need the funds.
		if (!dryRun) {
			const walletDAO = new WalletDAO(arweave, CLI_APP_NAME, CLI_APP_VERSION);
			const hasBalance = await walletDAO.walletHasBalance(wallet, boostedReward);
			if (!hasBalance) {
				throw new Error(
					`Insufficient wallet balance to post this snapshot. Estimated cost is ${new AR(
						boostedReward
					).toString()} AR, sent from wallet address '${owner}'.`
				);
			}
		}

		const rewardSettings: RewardSettings = boost
			? { reward: baseReward, feeMultiple: boost }
			: { reward: baseReward };
		const transaction = await arFsDao.prepareDriveStateTransaction(built, rewardSettings);

		if (!dryRun) {
			console.error(`Posting snapshot transaction '${transaction.id}'...`);
			try {
				await arFsDao.sendTransactionsAsChunks([transaction]);
			} catch (e) {
				// The header may already be accepted and paid for; posting again would pay twice.
				throw new Error(
					`Posting snapshot transaction '${transaction.id}' failed: ${e instanceof Error ? e.message : e}. ` +
						'Its header may already be paid for; check its status with `ardrive tx-status` before retrying.'
				);
			}
		} else {
			console.error(`DRY RUN: would post snapshot transaction '${transaction.id}'`);
		}

		console.log(
			JSON.stringify(
				{
					...summary,
					txId: transaction.id,
					transport: 'arweave',
					reward: boostedReward.toString(),
					dryRun,
					posted: !dryRun
				},
				null,
				4
			)
		);

		return SUCCESS_EXIT_CODE;
	})
});
