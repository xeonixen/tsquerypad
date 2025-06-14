declare const doc: {
  get lines(): string[];
  get linesAsync(): AsyncGenerator<string>;
  get fullText(): string;
}

//@ts-ignore
declare async function* __userWrapper__(): AsyncGenerator<any>;

interface Group<TKey, TElement> extends Array<TElement> {
  key: TKey;
}

type UserReturnType =
  string
  | string[]
  | number[]
  | { x: number, y: number }[]
  | { label: string, value: number }[]
  | AsyncGenerator<string>
  | AsyncGenerator<string[]>
  | void;

interface String {
  /**
   * Parses the string as JSON (after replacing single quotes with double quotes).
   * @template T - Optional type of the parsed result. Defaults to any.
   * @returns Parsed object of type T, or null if parsing fails.
   */
  json<T = any>(): T | null;
}
interface Object {
  /**
   * Converts the object to a JSON string.
   * @param {number} [space] Optional number of spaces for pretty-printing.
   * @returns {string} JSON string representation of the object.
   */
  json(space?: number): string;
}
interface Array<T> {

  /**
   * Returns a new array with unique elements (removes duplicates).
   * @returns {T[]} Array of distinct elements.
   */
  distinct(): T[];

  /**
   * Returns a new array with unique elements (removes duplicaes).
   * @returns {T[]}
   */
  distinct<R>(selector: (item: T) => R): T[];

  /**
   * Joins two arrays elementwise using a combiner function.
   * @template U, R
   * @param {U[]} other - The other array to zip with.
   * @param {(a: T, b: U) => R} [combiner] - Function to combine elements from both arrays. Defaults to a tuple [T, U].
   * @returns {R[]} Array of combined results.
   */
  zip<U, R = [T, U]>(other: U[], combiner?: (a: T, b: U) => R): R[];

  /**
   * Returns the sum of all numbers in the array.
   * @returns {number} Sum of the elements.
   */
  sum(): number;

  /**
   * Returns the sum of values selected from each item.
   * @param {(item: T) => number} selector - Function to select the number to sum from each item.
   * @returns {number} Sum of the selected values.
   */
  sum(selector: (item: T) => number): number;

  /**
   * Returns the minimum element in the array.
   * @returns {T} The minimum element.
   */
  min(): T;

  /**
   * Returns the element with the minimum selected value.
   * @param {(item: T) => number} selector - Function to select the number to compare for minimum.
   * @returns {T} The element with the minimum selected value.
   */
  min(selector: (item: T) => number): T;

  /**
   * Returns the maximum element in the array.
   * @returns {T} The maximum element.
   */
  max(): T;

  /**
   * Returns the element with the maximum selected value.
   * @param {(item: T) => number} selector - Function to select the number to compare for maximum.
   * @returns {T} The element with the maximum selected value.
   */
  max(selector: (item: T) => number): T;

  /**
   * Returns the average of all numbers in the array.
   * @returns {number} Average of the elements.
   */
  average(): number;

  /**
   * Returns the average of selected values from each item.
   * @param {(item: T) => number} selector - Function to select the number for averaging.
   * @returns {number} Average of the selected values.
   */
  average(selector: (item: T) => number): number;

  /**
   * Groups elements by a key selector. Returns an array of groups.
   * Each group is an array with a `key` property.
   */
  groupBy<TKey>(keySelector: (item: T) => TKey): Group<TKey, T>[];

  /**
   * Returns the last element of the array that satisfies the optional predicate.
   * If no predicate is provided, returns the last element of the array.
   * Throws an error if no matching element is found or the array is empty.
   * @param predicate Optional function to test each element.
   * @returns The last matching element.
   * @throws If no element matches or array is empty.
   */
  last(predicate?: (item: T) => boolean): T;

  /**
   * Returns the last element of the array that satisfies the optional predicate.
   * If no predicate is provided, returns the last element of the array.
   * Returns undefined if no matching element is found or the array is empty.
   * @param predicate Optional function to test each element.
   * @returns The last matching element or undefined.
   */
  lastOrDefault(predicate?: (item: T) => boolean): T | undefined;

  /**
   * Returns the first element of the array that satisfies the optional predicate.
   * If no predicate is provided, returns the first element of the array.
   * Throws an error if no matching element is found or the array is empty.
   * @param predicate Optional function to test each element.
   * @returns The first matching element.
   * @throws If no element matches or array is empty.
   */
  first(predicate?: (item: T) => boolean): T;

  /**
   * Returns the first element of the array that satisfies the optional predicate.
   * If no predicate is provided, returns the first element of the array.
   * Returns undefined if no matching element is found or the array is empty.
   * @param predicate Optional function to test each element.
   * @returns The first matching element or undefined.
   */
  firstOrDefault(predicate?: (item: T) => boolean): T | undefined;

  /**
   * Returns a new array sorted in ascending order based on a selector function.
   * Does not modify the original array.
   * 
   * @param selector - A function that returns the value to sort by.
   * @returns {T[]} A new sorted array.
   * 
   * @example
   * const sorted = users.sortBy(user => user.age);
   */
  sortBy<R>(selector: (item: T) => R): T[];

  /**
   * Returns a new array sorted in descending order based on a selector function.
   * Does not modify the original array.
   * 
   * @param selector - A function that returns the value to sort by.
   * @returns {T[]} A new sorted array in descending order.
   * 
   * @example
   * const sorted = users.sortByDescending(user => user.age);
   */
  sortByDescending<R>(selector: (item: T) => R): T[];
}
