import * as fs from 'fs';
// import { promises as fsa, createReadStream } from 'fs';
import { Readable } from 'stream';

export interface ExtractStringsOptions {
  encoding?: BufferEncoding;  // default 'utf8'
  minLength?: number;         // default 4
}

/**
 * Extracts printable ASCII strings from a binary file or buffer asynchronously.
 * @param filePath Path to the binary file OR a Buffer/Uint8Array containing binary data.
 * @param options Optional parameters:
 *   - encoding: character encoding to interpret strings (default 'utf8').
 *   - minLength: minimum length of extracted strings (default 4).
 * @returns Promise resolving to an array of strings found.
 */
export function extractStrings(
  filePath: string,
  options?: ExtractStringsOptions
): string[] {
  const encoding = options?.encoding ?? 'utf8';
  const minLength = options?.minLength ?? 4;

  const buffer = fs.readFileSync(filePath);

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




export async function* extractStringsAsync(filePath: string, options?: ExtractStringsOptions): AsyncGenerator<string> {
  console.time("read and parse whole file");
  const lines = extractStrings(filePath, options);
  console.timeEnd("read and parse whole file");
  console.time("yield return all lines");
  for(const line of lines){
    yield line;
  }
  console.timeEnd("yield return all lines");
}