/**
 * Capturing group 1: the points after the comma with trimmed zeros
 */
export const FLOATING_POINT_REGEXP = /^\d*\.\d{12}([1-9]+)$/;

export function assertARPrecision(arAmount: string): void {
	if (Number.isNaN(+arAmount)) {
		throw new Error(`The AR amount must be a number. Got: ${arAmount}`);
	}

	if (+arAmount < 0.0) {
		throw new Error(`The AR amount must be a positive number. Got: ${arAmount}`);
	}

	const excessiveDigits = arAmount.match(FLOATING_POINT_REGEXP)?.[1] || '';
	if (excessiveDigits.length) {
		throw new Error(
			`The AR amount must have a maximum of 12 digits of precision, but got ${12 + excessiveDigits.length}`
		);
	}
}
