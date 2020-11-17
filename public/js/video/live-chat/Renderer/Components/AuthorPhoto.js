import Component from '/js/DomComponents/Component.js';

export default class AuthorPhoto extends Component {
    constructor(url, settings={}) {
        super();
        this._url = url;
        this._settings = {
            opacity: settings.opacity ?? 1,
        };
    }

    _render() {
        return {
            E: 'div',
            className: 'chat-author-photo-wrapper',
            style: {opacity: this._settings.opacity},
            C: {
                E: 'img',
                className: 'chat-author-photo',
                src: this._url,
                alt: '',
            },
        };
    }
}
