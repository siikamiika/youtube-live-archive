import buildDom from '/js/helpers/build-dom.js';

export default class AuthorPhoto {
    constructor(url) {
        this._url = url;
        this.element = buildDom(this._render());
    }

    _render() {
        return {
            E: 'div',
            className: 'chat-author-photo-wrapper',
            C: {
                E: 'img',
                className: 'chat-author-photo',
                src: this._url,
                alt: '',
            },
        };
    }
}
