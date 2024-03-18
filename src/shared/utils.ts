/**
 * Creates an array of chunks from the given array with a specified size.
 * @param arr The array to be chunked.
 * @param size The size of each chunk.
 * @returns An array of chunks.
 */
const createChunks = (arr: any[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

/**
 * Executes tasks on items in batches and invokes a callback upon completion of each batch.
 * @param task The task function to be executed on each item.
 * @param items The array of items on which the task is to be executed.
 * @param batchSize The size of each batch.
 * @param onBatchComplete The callback function invoked upon completion of each batch.
 */
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

/**
 * Fetches a resource from a URL with retry logic.
 * @param url The URL of the resource to fetch.
 * @param options The options for the fetch request.
 * @param retries The number of retry attempts (default is 5).
 * @returns A Promise resolving to the fetched response.
 * @throws Error when retries are exhausted or server error occurs.
 */
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

/**
 * Parses command-line arguments and returns key-value pairs.
 * @param argv The array of command-line arguments.
 * @returns An object containing parsed key-value pairs.
 */
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
