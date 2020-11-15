import AuthorPhoto from './AuthorPhoto.js';
import {convertArgbIntRgbaCss} from '/js/helpers/css.js';
import ChatMessage from './ChatMessage.js';

export default class ChatTickerMessagePaid {
    constructor(chatItem, onClick) {
        this._chatItem = chatItem;
        this._onClick = onClick;
    }

    render() {
        if (this._chatItem.type !== 'CHAT_TICKER_MESSAGE_PAID') { throw new Error('Invalid type: ' + this._chatItem.type); }

        return {
            E: 'div',
            className: 'chat-ticker-wrapper',
            dataset: {id: this._chatItem.id, offset: this._chatItem.offset},
            C: [
                {
                    E: 'div',
                    className: 'chat-ticker-progress',
                    style: {backgroundColor: convertArgbIntRgbaCss(this._chatItem.endBgColor)},
                    onclick: this._onClick,
                    C: {
                        E: 'div',
                        className: 'chat-ticker-progress-bar',
                        style: {backgroundColor: convertArgbIntRgbaCss(this._chatItem.startBgColor)},
                        C: {
                            E: 'div',
                            className: 'chat-ticker chat-ticker-message-paid',
                            C: [
                                (new AuthorPhoto(this._chatItem.authorPhotoUrl)).render(),
                                {
                                    E: 'span',
                                    className: 'chat-ticker-paid-amount',
                                    style: {color: convertArgbIntRgbaCss(this._chatItem.amountColor)},
                                    C: this._chatItem.paidAmount
                                },
                            ]
                        }
                    }
                },
                {
                    E: 'div',
                    style: {display: 'none'},
                    className: 'chat-ticker-expanded-message-wrapper',
                    C: ChatMessage.create(this._chatItem.expandedMessage).render(),
                }
            ]
        };
    }
}