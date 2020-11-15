export default class AuthorPhoto {
    constructor(url) {
        this._url = url;
    }

    render() {
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
