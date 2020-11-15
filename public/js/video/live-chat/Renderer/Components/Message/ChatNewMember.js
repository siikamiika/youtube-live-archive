import Component from '/js/DomComponents/Component.js';
import MessageParts from '../MessageParts.js';
import AuthorPhoto from '../AuthorPhoto.js';
import AuthorName from '../AuthorName.js';

export default class ChatNewMember extends Component {
    constructor(chatItem) {
        super();
        this._chatItem = chatItem;
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
                        AuthorPhoto.create(this._chatItem.authorPhotoUrl).element,
                        AuthorName.create(this._chatItem).element,
                    ]
                },
                {
                    E: 'div',
                    className: 'chat-new-member-body',
                    C: MessageParts.create(this._chatItem.messageParts).element,
                }
            ],
        };
    }
}
