import buildDom from '/js/helpers/build-dom.js';

export default class Component {
    constructor() {
        this._element = null;
    }

    get element() {
        return this._element;
    }

    prepare() {
        this._element = buildDom(this._render());
    }

    static create(...args) {
        const instance = new this(...args);
        instance.prepare();
        return instance;
    }
}
