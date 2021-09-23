export interface ArweaveOracle {
	getWinstonPriceForByteCount(byteCount: number): Promise<number>;
}
