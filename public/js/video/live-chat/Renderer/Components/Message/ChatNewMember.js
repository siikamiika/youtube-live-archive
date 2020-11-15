import buildDom from '/js/helpers/build-dom.js';
import MessageParts from '../MessageParts.js';
import AuthorPhoto from '../AuthorPhoto.js';
import AuthorName from '../AuthorName.js';

export default class ChatNewMember {
    constructor(chatItem) {
        this._chatItem = chatItem;
        this.element = buildDom(this._render());
    }

    _render() {
        if (this._chatItem.type !== 'CHAT_NEW_MEMBER') { throw new Error('Invalid type: ' + this._chatItem.type); }

        return {
            E: 'div',
            className: 'chat-new-member',
            dataset: {id: this._chatItem.id, offset: this._chatItem.offset},
            C: [
                {
                    E: 'div',
                    className: 'chat-new-member-header',
                    C: [
                        (new AuthorPhoto(this._chatItem.authorPhotoUrl)).element,
                        (new AuthorName(this._chatItem)).element,
                    ]
                },
                {
                    E: 'div',
                    className: 'chat-new-member-body',
                    C: (new MessageParts(this._chatItem.messageParts)).element,
                }
            ],
        };
    }
}
