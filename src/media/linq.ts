// @ts-nocheck
export function defineCustomFunctions() {
    if (!Array.prototype['distinct']) {
        Object.defineProperty(Array.prototype, 'distinct', {
            value: function <T, R>(this: T[], selector?: (item: T) => R): T[] {
                const seen = new Set<any>();
                return this.filter(item => {
                    const key = selector ? selector(item) : item;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            },
            enumerable: false
        });
    }

    if (!Array.prototype['last']) {
        Object.defineProperty(Array.prototype, 'last', {
            value: function <T, R>(this: T[], selector?: (item: T) => R): T[] {
                const seen = new Set<any>();
                return this.filter(item => {
                    const key = selector ? selector(item) : item;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            },
            enumerable: false
        });
    }

    if (!Array.prototype['zip']) {
        Object.defineProperty(Array.prototype, 'zip', {
            value: function (other: any[], combiner: Function = (a: any, b: any) => [a, b]) {
                const length = Math.min(this.length, other.length);
                const result = [];
                for (let i = 0; i < length; i++) {
                    result.push(combiner(this[i], other[i]));
                }
                return result;
            },
            enumerable: false
        });
    }

    if (!Array.prototype['sum']) {
        Object.defineProperty(Array.prototype, 'sum', {
            value: function (selector?: Function) {
                if (selector) {
                    return this.reduce((acc, x) => acc + selector(x), 0);
                }
                return this.reduce((acc, x) => acc + x, 0);
            },
            enumerable: false
        });
    }

    if (!Array.prototype['min']) {
        Object.defineProperty(Array.prototype, 'min', {
            value: function (selector?: Function) {
                if (this.length === 0) return undefined;
                if (selector) {
                    return this.reduce((min, x) => selector(x) < selector(min) ? x : min);
                }
                return Math.min(...this);
            },
            enumerable: false
        });
    }

    if (!Array.prototype['max']) {
        Object.defineProperty(Array.prototype, 'max', {
            value: function (selector?: Function) {
                if (this.length === 0) return undefined;
                if (selector) {
                    return this.reduce((max, x) => selector(x) > selector(max) ? x : max);
                }
                return Math.max(...this);
            },
            enumerable: false
        });
    }

    if (!Array.prototype['average']) {
        Object.defineProperty(Array.prototype, 'average', {
            value: function (selector?: Function) {
                if (this.length === 0) return undefined;
                const total = selector ? this.reduce((acc, x) => acc + selector(x), 0)
                    : this.reduce((acc, x) => acc + x, 0);
                return total / this.length;
            },
            enumerable: false
        });
    }
    if (!Array.prototype['groupBy']) {
        Object.defineProperty(Array.prototype, 'groupBy', {
            value: function (keySelector) {
                const map = new Map();
                for (const item of this) {
                    const key = keySelector(item);
                    if (!map.has(key)) {
                        map.set(key, []);
                    }
                    map.get(key).push(item);
                }
                const groups = [];
                for (const [key, values] of map) {
                    // Define the key property on the array of grouped items
                    Object.defineProperty(values, 'key', {
                        value: key,
                        enumerable: false,
                        writable: false,
                        configurable: false
                    });
                    groups.push(values);
                }
                return groups;
            },
            enumerable: false
        });
    }
    if (!Array.prototype['last']) {
        Object.defineProperty(Array.prototype, 'last', {
            value: function (predicate) {
                if (!predicate) {
                    if (this.length === 0) throw new Error('Array is empty');
                    return this[this.length - 1];
                }
                for (let i = this.length - 1; i >= 0; i--) {
                    if (predicate(this[i])) {
                        return this[i];
                    }
                }
                throw new Error('No element satisfies the predicate.');
            },
            enumerable: false,
        });
    }

    if (!Array.prototype['lastOrDefault']) {
        Object.defineProperty(Array.prototype, 'lastOrDefault', {
            value: function (predicate) {
                if (!predicate) {
                    return this.length === 0 ? undefined : this[this.length - 1];
                }
                for (let i = this.length - 1; i >= 0; i--) {
                    if (predicate(this[i])) {
                        return this[i];
                    }
                }
                return undefined;
            },
            enumerable: false,
        });
    }

    if (!Array.prototype['first']) {
        Object.defineProperty(Array.prototype, 'first', {
            value: function (predicate) {
                if (!predicate) {
                    if (this.length === 0) throw new Error('Array is empty');
                    return this[0];
                }
                for (let i = 0; i < this.length; i++) {
                    if (predicate(this[i])) {
                        return this[i];
                    }
                }
                throw new Error('No element satisfies the predicate.');
            },
            enumerable: false,
        });
    }

    if (!Array.prototype['firstOrDefault']) {
        Object.defineProperty(Array.prototype, 'firstOrDefault', {
            value: function (predicate) {
                if (!predicate) {
                    return this.length === 0 ? undefined : this[0];
                }
                for (let i = 0; i < this.length; i++) {
                    if (predicate(this[i])) {
                        return this[i];
                    }
                }
                return undefined;
            },
            enumerable: false,
        });
    }

    if (!Array.prototype['sortBy']) {
        Object.defineProperty(Array.prototype, 'sortBy', {
            value: function <T, R>(this: T[], selector: (item: T) => R): T[] {
                return this.slice().sort((a, b) => {
                    const aVal = selector(a);
                    const bVal = selector(b);

                    if (aVal === bVal) return 0;
                    if (aVal === undefined || aVal === null) return -1;
                    if (bVal === undefined || bVal === null) return 1;

                    return aVal < bVal ? -1 : 1;
                });
            },
            enumerable: false
        });
    }

    if (!Array.prototype['sortByDescending']) {
        Object.defineProperty(Array.prototype, 'sortByDescending', {
            value: function <T, R>(this: T[], selector: (item: T) => R): T[] {
                return this.slice().sort((a, b) => {
                    const aVal = selector(a);
                    const bVal = selector(b);

                    if (aVal === bVal) return 0;
                    if (aVal === undefined || aVal === null) return 1;
                    if (bVal === undefined || bVal === null) return -1;

                    return aVal > bVal ? -1 : 1;
                });
            },
            enumerable: false
        });
    }

    if (!String.prototype['json']) {
        Object.defineProperty(String.prototype, 'json', {
            value: function <T = any>(): T | null {
                try {
                    const normalized = this.replace(/'/g, '"');
                    return JSON.parse(normalized) as T;
                } catch {
                    return null;
                }
            },
            enumerable: false,
        });
    }

    if (!Object.prototype.hasOwnProperty('json')) {
        Object.defineProperty(Object.prototype, 'json', {
            value: function (space?: number): string {
                return JSON.stringify(this, null, space);
            },
            enumerable: false,
        });
    }

    async function* filterAsync(gen: AsyncGenerator<T>, predicate: (line: T) => boolean) {
        for await (const line of gen) {
            if (predicate(line)) yield line;
        }
    }
    async function* asyncMap(gen, mapper) {
        for await (const item of gen) {
            yield await mapper(item);
        }
    }

}