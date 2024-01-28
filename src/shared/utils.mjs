const createChunks = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

export async function batch(task, items, batchSize, onBatchComplete) {
  const chunks = createChunks(items, batchSize);
  for (let i = 0; i < chunks.length; i++) {
    await Promise.all(chunks[i].map(task));
    onBatchComplete(i, chunks.length);
  }
}

export async function fetchRetry(url, options, retries = 5) {
  try {
    const response = await fetch(url, options);
    if (response.status >= 500) {
      const body = await response.text();
      throw new Error(`Server error code ${response.status}\n${body}`);
    }
    return response;
  } catch (err) {
    if (retries <= 0) {
      throw err;
    }
    return fetchRetry(url, options, retries - 1);
  }
}
