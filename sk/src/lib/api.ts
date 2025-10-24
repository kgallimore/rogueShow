export async function getChat(message: string) {
	const response = await fetch('/api/ai/stream', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ message })
	});
	if (!response.body) throw new Error('No response body');
	const reader = response.body.getReader();
	return reader;
}
