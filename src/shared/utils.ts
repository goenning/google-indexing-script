const createChunks = (arr: any[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

export async function batch(
  task: (url: string) => void,
  items: string[],
  batchSize: number,
  onBatchComplete: (batchIndex: number, batchCount: number) => void
) {
  const chunks = createChunks(items, batchSize);
  for (let i = 0; i < chunks.length; i++) {
    await Promise.all(chunks[i].map(task));
    onBatchComplete(i, chunks.length);
  }
}

export async function fetchRetry(url: string, options: RequestInit, retries: number = 5) {
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

export function parseCommandLineArgs(argv: string[]) {
  const parsedArgs: { [key: string]: string } = {};

  argv.forEach((arg, index) => {
    // Check if the argument is in the format --key=value or --key value
    const matches = arg.match(/^--([^=]+)(?:=(.+))?$/);
    if (matches) {
      const key = matches[1];
      const value = matches[2] || argv[index + 1]; // Use next argument if value is not provided
      parsedArgs[key] = value;
    }
  });

  return parsedArgs;
}
