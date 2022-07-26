import { get } from 'http';
import { createWriteStream } from 'fs';

export async function download(url: string, dest: string): Promise<void> {
	const file = createWriteStream(dest);
	return new Promise<void>((resolve, reject) => {
		let responseSent = false; // flag to make sure that response is sent only once.
		get(url, (response) => {
			response.pipe(file);
			file.on('finish', () => {
				file.close();
				() => {
					if (responseSent) return;
					responseSent = true;
					resolve();
				};
			});
		}).on('error', (err) => {
			if (responseSent) return;
			responseSent = true;
			reject(err);
		});
	});
}
