declare const lines: string[];
type UserReturnType = 
    string 
  | string[] 
  | number[]
  | { x: number, y: number }[]
  | { label: string, value: number }[];
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
    distinct<R>(selector: (item: T)=> R): T[];

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
}
