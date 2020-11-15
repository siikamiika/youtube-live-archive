import buildDom from '/js/helpers/build-dom.js';

export default class MessageParts {
    constructor(parts) {
        this._parts = parts;
        this.element = buildDom(this._render());
    }

    _render() {
        const output = [];
        for (const part of this._parts) {
            if (part.text) {
                output.push(this._renderText(part));
            } else if (part.emoji) {
                output.push(this._renderEmoji(part));
            }
        }
        // TODO fragment
        return {E: 'span', C: output};
    }

    _renderText(part) {
        return part.text;
    }

    _renderEmoji(part) {
        return {
            E: 'div',
            className: 'chat-emoji-container',
            C: {
                E: 'img',
                className: 'chat-emoji',
                src: part.emoji.url,
                alt: part.emoji.name,
                title: part.emoji.name,
            }
        };
    }
}
