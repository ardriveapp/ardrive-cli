import { CLICommand, ParametersHelper } from '../CLICommand';
import {
	BoostParameter,
	DriveIdParameter,
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
	ArFSPublicFileDataPrototype,
	ArFSPublicFileDataTransactionData,
	ByteCount,
	EID,
	GatewayAPI,
	GatewayOracle,
	gatewayUrlForArweave,
	RewardSettings,
	SNAPSHOT_CONTENT_TYPE,
	SNAPSHOT_ENTITY_TYPE,
	SnapshotTagName,
	Wallet,
	WalletDAO
} from 'ardrive-core-js';
import { ArFSTagSettings } from 'ardrive-core-js/lib/arfs/arfs_tag_settings';
// Not part of the public `exports.ts` surface (same as ArFSTagSettings above) -- deep-imported
// directly from their source modules, mirroring the existing pattern in `src/index.ts`.
import { ARDataPriceNetworkEstimator } from 'ardrive-core-js/lib/pricing/ar_data_price_network_estimator';
import { Turbo } from 'ardrive-core-js/lib/arfs/turbo';
import { CLI_APP_NAME, CLI_APP_VERSION } from '..';
import { getArweaveFromURL } from '../utils/get_arweave_for_url';
import { constructSnapshotData, snapshotDataToBuffer } from '../utils/snapshots/create_snapshot';

new CLICommand({
	name: 'create-snapshot',
	parameters: [
		{
			name: DriveIdParameter,
			required: true,
			description: `the ArFS entity ID of the PUBLIC drive to snapshot
\t\t\t\t\t\t\t• Private drive snapshots are not yet supported`
		},
		BoostParameter,
		DryRunParameter,
		WalletFileParameter,
		SeedPhraseParameter,
		GatewayParameter,
		ShouldTurboParameter,
		TurboUrlParameter
	],
	action: new CLIAction(async function action(options) {
		const parameters = new ParametersHelper(options);

		const driveId = parameters.getRequiredParameterValue(DriveIdParameter, EID);
		const dryRun = parameters.isDryRun();
		const boost = parameters.getOptionalBoostSetting();
		const useTurbo = !!parameters.getParameterValue(ShouldTurboParameter);
		const turboUrl = parameters.getTurbo();

		const arweave = getArweaveFromURL(parameters.getGateway());
		const wallet: Wallet = await parameters.getRequiredWallet();
		const owner = await wallet.getAddress();

		// A single GatewayAPI instance is shared by the entity-history query AND the DAO used to
		// post the resulting snapshot transaction, so both honor the same --gateway selection.
		const gatewayApi = new GatewayAPI({ gatewayUrl: gatewayUrlForArweave(arweave) });

		// 1. Gather the drive's entity metadata history and build the snapshot body. The body shape
		// (`{ txSnapshots: [...] }`) is dictated by core-js's own `parseSnapshotData`, so a snapshot
		// written here round-trips through core-js's snapshot-accelerated listing path.
		const { data, blockStart, blockEnd, entityCount } = await constructSnapshotData({
			owner,
			driveId,
			gatewayApi
		});
		const snapshotBody = snapshotDataToBuffer(data);

		console.error(
			`Snapshotting ${entityCount} entity revision(s) of drive '${driveId}' spanning blocks ${blockStart}-${blockEnd} (${snapshotBody.byteLength} bytes)...`
		);

		// A snapshot is a standalone data transaction tagged Entity-Type/Drive-Id/Block-Start/Block-End
		// (per ArFS), NOT a child file entity -- so it is built as a bare ArFSPublicFileDataPrototype
		// (Content-Type + these custom tags only) rather than going through the normal file-upload path,
		// which would additionally attach File-Id/Parent-Folder-Id/Name ArFS entity tags.
		const objectData = new ArFSPublicFileDataTransactionData(snapshotBody);
		const dataPrototype = new ArFSPublicFileDataPrototype(objectData, SNAPSHOT_CONTENT_TYPE, {
			[SnapshotTagName.entityType]: SNAPSHOT_ENTITY_TYPE,
			[SnapshotTagName.driveId]: `${driveId}`,
			[SnapshotTagName.blockStart]: `${blockStart}`,
			[SnapshotTagName.blockEnd]: `${blockEnd}`
		});

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

		if (useTurbo) {
			// excludedTagNames: ['ArFS'] routes through the raw file-DATA tag assembly (Content-Type +
			// our custom tags + App-Name/App-Version), skipping the ArFS entity-metadata tag set.
			const dataItem = await arFsDao.prepareArFSDataItem({
				objectMetaData: dataPrototype,
				excludedTagNames: ['ArFS']
			});

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
					{
						snapshotId: dataItem.id,
						driveId: `${driveId}`,
						blockStart,
						blockEnd,
						entityCount,
						dataSize: snapshotBody.byteLength,
						turbo: turboResult,
						dryRun,
						posted: !dryRun
					},
					null,
					4
				)
			);

			return SUCCESS_EXIT_CODE;
		}

		// AR (layer 1) path -- estimate cost, then require the wallet actually have the funds before
		// signing/sending, mirroring the balance assertion every other costed command relies on.
		const priceEstimator = new ARDataPriceNetworkEstimator(new GatewayOracle(gatewayUrlForArweave(arweave)));
		const baseReward = await priceEstimator.getBaseWinstonPriceForByteCount(new ByteCount(snapshotBody.byteLength));
		const boostedReward = boost?.wouldBoostReward() ? boost.boostedWinstonReward(baseReward) : baseReward;

		console.error(`Estimated cost: ${new AR(boostedReward).toString()} AR (${boostedReward.toString()} Winston)`);

		const walletDAO = new WalletDAO(arweave, CLI_APP_NAME, CLI_APP_VERSION);
		const hasBalance = await walletDAO.walletHasBalance(wallet, boostedReward);
		if (!hasBalance) {
			throw new Error(
				`Insufficient wallet balance to post this snapshot. Estimated cost is ${new AR(
					boostedReward
				).toString()} AR, sent from wallet address '${owner}'.`
			);
		}

		const rewardSettings: RewardSettings = boost
			? { reward: baseReward, feeMultiple: boost }
			: { reward: baseReward };
		const transaction = await arFsDao.prepareArFSObjectTransaction({
			objectMetaData: dataPrototype,
			rewardSettings,
			excludedTagNames: ['ArFS']
		});

		if (!dryRun) {
			console.error(`Posting snapshot transaction '${transaction.id}'...`);
			await arFsDao.sendTransactionsAsChunks([transaction]);
		} else {
			console.error(`DRY RUN: would post snapshot transaction '${transaction.id}'`);
		}

		console.log(
			JSON.stringify(
				{
					snapshotId: transaction.id,
					driveId: `${driveId}`,
					blockStart,
					blockEnd,
					entityCount,
					dataSize: snapshotBody.byteLength,
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
