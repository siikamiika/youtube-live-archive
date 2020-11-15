import Component from '/js/DomComponents/Component.js';

export default class AuthorPhoto extends Component {
    constructor(url) {
        super();
        this._url = url;
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
