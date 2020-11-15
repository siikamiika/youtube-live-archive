export default class MessageParts {
    constructor(parts) {
        this._parts = parts;
    }

    render() {
        const output = [];
        for (const part of this._parts) {
            if (part.text) {
                output.push(this._renderText(part));
            } else if (part.emoji) {
                output.push(this._renderEmoji(part));
            }
        }
        return output;
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
