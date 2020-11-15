import buildDom from '/js/helpers/build-dom.js';
import MessageParts from '../MessageParts.js';
import AuthorPhoto from '../AuthorPhoto.js';
import ChatMessage from '../Message/ChatMessage.js';
import {convertArgbIntRgbaCss} from '/js/helpers/css.js';

export default class ChatTickerNewMember {
    constructor(chatItem, onClick) {
        this._chatItem = chatItem;
        this._onClick = onClick;
        this.element = buildDom(this._render());
    }

    _render() {
        if (this._chatItem.type !== 'CHAT_TICKER_NEW_MEMBER') { throw new Error('Invalid type: ' + this._chatItem.type); }

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
                            className: 'chat-ticker chat-ticker-new-member',
                            C: [
                                (new AuthorPhoto(this._chatItem.authorPhotoUrl)).element,
                                {
                                    E: 'span',
                                    className: 'chat-ticker-member-text',
                                    style: {color: convertArgbIntRgbaCss(this._chatItem.textColor)},
                                    C: (new MessageParts(this._chatItem.textParts)).element,
                                },
                            ]
                        }
                    }
                },
                {
                    E: 'div',
                    style: {display: 'none'},
                    className: 'chat-ticker-expanded-message-wrapper',
                    C: ChatMessage.create(this._chatItem.expandedMessage).element,
                }
            ]
        };
    }
}
