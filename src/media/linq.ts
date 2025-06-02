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
}
