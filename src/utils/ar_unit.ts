/**
 * Capture group 1: decimal precision beyond 12 digits
 */
export const FLOATING_POINT_REGEXP = /^\d*\.\d{12}(\d+)$/;

export function assertARPrecision(arAmount: string): void {
	if (Number.isNaN(+arAmount)) {
		throw new Error(`The AR amount must be a number. Got: ${arAmount}`);
	}

	if (+arAmount < 0.0) {
		throw new Error(`The AR amount must be a positive number. Got: ${arAmount}`);
	}

	const excessiveDigits = arAmount.match(FLOATING_POINT_REGEXP)?.[1] || '';
	if (+excessiveDigits !== 0.0) {
		throw new Error(
			`The AR amount must have a maximum of 12 digits of precision, but got ${12 + excessiveDigits.length}`
		);
	}
}
