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
        this._element.__component = this;
    }

    static create(...args) {
        const instance = new this(...args);
        instance.prepare();
        return instance;
    }

    static createFromElement(element) {
        const component = element.__component;
        if (!component instanceof this) { throw new Error(`Attached component not instance of ${this.name}`); }
        return component;
    }
}
