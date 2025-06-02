import { promises as fs, createReadStream } from 'fs';

export interface ExtractStringsOptions {
  encoding?: BufferEncoding;  // default 'utf8'
  minLength?: number;         // default 4
}

type Input = string ;

/**
 * Extracts printable ASCII strings from a binary file or buffer asynchronously.
 * @param input Path to the binary file OR a Buffer/Uint8Array containing binary data.
 * @param options Optional parameters:
 *   - encoding: character encoding to interpret strings (default 'utf8').
 *   - minLength: minimum length of extracted strings (default 4).
 * @returns Promise resolving to an array of strings found.
 */
export async function extractStrings(
  input: Input,
  options?: ExtractStringsOptions
): Promise<string[]> {
  const encoding = options?.encoding ?? 'utf8';
  const minLength = options?.minLength ?? 4;

  let buffer: Buffer;
  if (typeof input === 'string') {
    buffer = await fs.readFile(input);
  } else {
    // input is already a Buffer or Uint8Array, normalize to Buffer if needed
    buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  }

  const result: string[] = [];
  let currentChars: number[] = [];

  for (const byte of buffer) {
    if (byte >= 32 && byte <= 126) {
      currentChars.push(byte);
    } else {
      if (currentChars.length >= minLength) {
        const str = Buffer.from(currentChars).toString(encoding);
        result.push(str);
      }
      currentChars = [];
    }
  }
  // check last collected chars
  if (currentChars.length >= minLength) {
    const str = Buffer.from(currentChars).toString(encoding);
    result.push(str);
  }

  return result;
}


export async function* extractStringsAsync(
  filePath: string,
  options?: ExtractStringsOptions
): AsyncGenerator<string> {
  const encoding = options?.encoding ?? 'utf8';
  const minLength = options?.minLength ?? 4;

  const stream = createReadStream(filePath);
  let currentChars: number[] = [];

  for await (const chunk of stream) {
    const buffer: Buffer = typeof chunk === 'string' ? Buffer.from(chunk, encoding) : chunk;

    for (const byte of buffer) {
      if (byte >= 32 && byte <= 126) {
        currentChars.push(byte);
      } else {
        if (currentChars.length >= minLength) {
          yield Buffer.from(currentChars).toString(encoding);
        }
        currentChars = [];
      }
    }
  }

  if (currentChars.length >= minLength) {
    yield Buffer.from(currentChars).toString(encoding);
  }
}

