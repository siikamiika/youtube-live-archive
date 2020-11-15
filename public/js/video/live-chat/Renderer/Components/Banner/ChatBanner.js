import buildDom from '/js/helpers/build-dom.js';
import MessageParts from '../MessageParts.js';
import ChatMessage from '../Message/ChatMessage.js';

export default class ChatBanner {
    constructor(chatItem, onClick, onCloseClick) {
        this._chatItem = chatItem;
        this._onClick = onClick;
        this._onCloseClick = onCloseClick;
        this.element = buildDom(this._render());
    }

    _render() {
        if (this._chatItem.type !== 'CHAT_BANNER') { throw new Error('Invalid type: ' + this._chatItem.type); }

        return {
            E: 'div',
            className: 'chat-banner',
            dataset: {id: this._chatItem.id, offset: this._chatItem.offset, closed: false, collapsed: false},
            onclick: this._onClick,
            C: [
                {
                    E: 'div',
                    className: 'chat-banner-header',
                    C: [
                        (new MessageParts(this._chatItem.headerTextParts)).element,
                        {
                            E: 'div',
                            className: 'chat-banner-close-button',
                            onclick: this._onCloseClick,
                        },
                    ]
                },
                {
                    E: 'div',
                    className: 'chat-banner-expanded-message-wrapper',
                    C: ChatMessage.create(this._chatItem.expandedMessage).element,
                }
            ]
        };
    }
}
