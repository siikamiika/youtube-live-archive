import buildDom from '/js/helpers/build-dom.js';
import MessageParts from '../MessageParts.js';
import AuthorPhoto from '../AuthorPhoto.js';
import AuthorName from '../AuthorName.js';

export default class ChatMessageNormal {
    constructor(chatItem) {
        this._chatItem = chatItem;
        this.element = buildDom(this._render());
    }

    _render() {
        if (this._chatItem.type !== 'CHAT_MESSAGE_NORMAL') { throw new Error('Invalid type: ' + this._chatItem.type); }
        return {
            E: 'div',
            className: 'chat-message chat-message-normal',
            dataset: {id: this._chatItem.id, offset: this._chatItem.offset},
            C: [
                (new AuthorPhoto(this._chatItem.authorPhotoUrl)).element,
                {E: 'span', className: 'chat-message-timestamp', C: this._formatOffsetTime(this._chatItem.offset)},
                (new AuthorName(this._chatItem)).element,
                {E: 'span', className: 'chat-message-body', C: (new MessageParts(this._chatItem.messageParts)).element},
            ],
        };
    }

    _formatOffsetTime(offset) {
        const negative = offset < 0;
        if (negative) {
            offset *= -1;
        }
        const h = Math.floor(offset / 3600000);
        offset = offset % 3600000;
        const m = Math.floor(offset / 60000);
        offset = offset % 60000;
        const s = Math.floor(offset / 1000);

        const sign = negative ? '-' : '';
        if (h > 0) {
            return `${sign}${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        return `${sign}${m}:${String(s).padStart(2, '0')}`;
    }
}
