import Component from '/js/DomComponents/Component.js';
import MessageParts from '../MessageParts.js';
import AuthorPhoto from '../AuthorPhoto.js';
import AuthorName from '../AuthorName.js';
import {convertArgbIntRgbaCss} from '/js/helpers/css.js';

export default class ChatMessagePaid extends Component {
    constructor(chatItem) {
        super();
        this._chatItem = chatItem;
    }

    _render() {
        if (this._chatItem.type !== 'CHAT_MESSAGE_PAID') { throw new Error('Invalid type: ' + this._chatItem.type); }

        const header = {
            E: 'div',
            className: 'chat-message-paid-header',
            style: {
                color: convertArgbIntRgbaCss(this._chatItem.headerFgColor),
                backgroundColor: convertArgbIntRgbaCss(this._chatItem.headerBgColor),
            },
            C: [
                {
                    E: 'div',
                    C: [
                        AuthorPhoto.create(this._chatItem.authorPhotoUrl).element,
                        AuthorName.create(this._chatItem).element,
                    ]
                },
                {
                    E: 'div',
                    C: {E: 'span', className: 'chat-message-paid-amount', C: this._chatItem.paidAmount}
                }
            ]
        };

        const body = {
            E: 'div',
            className: 'chat-message-paid-body',
            style: {
                color: convertArgbIntRgbaCss(this._chatItem.bodyFgColor),
                backgroundColor: convertArgbIntRgbaCss(this._chatItem.bodyBgColor),
            },
            C: {
                E: 'span',
                className: 'chat-message-body',
                style: {color: convertArgbIntRgbaCss(this._chatItem.bodyFgColor)},
                C: MessageParts.create(this._chatItem.messageParts).element,
            }
        };

        return {
            E: 'div',
            className: 'chat-message chat-message-paid',
            dataset: {id: this._chatItem.id, offset: this._chatItem.offset},
            C: [header, body],
        };
    }
}
