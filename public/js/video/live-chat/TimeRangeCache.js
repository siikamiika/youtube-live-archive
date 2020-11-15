export default class TimeRangeCache {
    constructor(getStart, getEnd) {
        this._getStart = getStart;
        this._getEnd = getEnd;
        this._itemsByLengthRange = {};
    }

    // must add items in order
    add(item) {
        const start = this._getStart(item);
        const end = this._getEnd(item);
        const length = end - start;

        let lengthRangeKey = 1;
        while ((lengthRangeKey *= 2) < length) { }

        if (!this._itemsByLengthRange[lengthRangeKey]) {
            this._itemsByLengthRange[lengthRangeKey] = [];
        }

        this._itemsByLengthRange[lengthRangeKey].push({start, end, item});
    }

    // required when mutating times or inserting out of order
    rebuild() {
        const items = Array.from(this.getAll());
        items.sort((a, b) => this._getStart(a) - this._getStart(b));

        this._itemsByLengthRange = {};
        for (const item of items) {
            this.add(item);
        }
    }

    *get(time) {
        for (const [lengthRangeKey, itemsInRange] of Object.entries(this._itemsByLengthRange)) {
            const startIndex = this._findIndex(itemsInRange, time - lengthRangeKey);
            for (let i = startIndex; i < itemsInRange.length; i++) {
                const {start, end, item} = itemsInRange[i];
                if (start > time) { break; }
                if (end <= time) { continue; }
                yield item;
            }
        }
    }

    *getAll() {
        for (const [_, itemsInRange] of Object.entries(this._itemsByLengthRange)) {
            for (const {item} of itemsInRange) {
                yield item;
            }
        }
    }

    // should always have at least 1 element
    _findIndex(array, value) {
        let lo = 0;
        let hi = array.length - 1;
        while (lo !== hi) {
            const mid = Math.ceil((lo + hi) / 2);
            const mValue = array[mid].start;
            if (mValue > value) {
                hi = mid - 1;
            } else {
                lo = mid;
            }
        }
        return lo;
    }
}
