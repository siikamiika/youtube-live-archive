import Component from '/js/DomComponents/Component.js';
import MessageParts from '../MessageParts.js';
import AuthorPhoto from '../AuthorPhoto.js';
import AuthorName from '../AuthorName.js';

export default class ChatMessageNormal extends Component {
    constructor(chatItem, settings={}) {
        super();
        this._chatItem = chatItem;
        this._settings = {
            bodyTextShadow: settings.bodyTextShadow ?? '',
            bodyFontWeight: settings.bodyFontWeight ?? null,
            authorOpacity: settings.authorOpacity ?? null,
        };
    }

    _render() {
        if (this._chatItem.type !== 'CHAT_MESSAGE_NORMAL') { throw new Error('Invalid type: ' + this._chatItem.type); }
        return {
            E: 'div',
            className: 'chat-message chat-message-normal',
            dataset: {id: this._chatItem.id, offset: this._chatItem.offset},
            C: [
                AuthorPhoto.create(this._chatItem.authorPhotoUrl, {opacity: this._settings.authorOpacity}).element,
                {E: 'span', style: {opacity: this._settings.authorOpacity ?? 1}, className: 'chat-message-timestamp', C: this._formatOffsetTime(this._chatItem.offset)},
                AuthorName.create(this._chatItem, {opacity: this._settings.authorOpacity ?? 1}).element,
                {
                    E: 'span',
                    className: 'chat-message-body',
                    style: {textShadow: this._settings.bodyTextShadow, fontWeight: this._settings.bodyFontWeight},
                    C: MessageParts.create(this._chatItem.messageParts).element
                },
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
