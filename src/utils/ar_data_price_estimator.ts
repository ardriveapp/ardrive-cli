import type { ArDriveCommunityTip } from '../types';

export interface ARDataPriceEstimator {
	getARPriceForByteCount: (byteCount: number, arDriveCommunityTip: ArDriveCommunityTip) => Promise<number>;
	getByteCountForAR: (arPrice: number, arDriveCommunityTip: ArDriveCommunityTip) => Promise<number>;
}
