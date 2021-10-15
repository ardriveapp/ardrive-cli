export const MAX_DIGITS_OF_PRECISION = 12;
/**
 * Capturing group 1: the points after the comma with thrimmed zeros
 */
export const FLOATING_POINT_REGEXP = /^\d*(?:\.(\d*[1-9])0*)?$/;

export function assertARPrecision(arAmount: string): void {
	const floatingPointMatch = arAmount.match(FLOATING_POINT_REGEXP);
	if (!floatingPointMatch) {
		throw new Error(`The AR amount must be a number. Got: ${arAmount}`);
	}
	const digitsOfPrecission = floatingPointMatch[1] || '';
	const numberOfDigitsOfPrecision = digitsOfPrecission.length;
	if (numberOfDigitsOfPrecision > MAX_DIGITS_OF_PRECISION) {
		throw new Error(
			`The AR amount must have a maximum of 12 digits of precision, but got ${numberOfDigitsOfPrecision}`
		);
	}
}
