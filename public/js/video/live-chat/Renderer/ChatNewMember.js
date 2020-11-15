import MessageParts from './MessageParts.js';
import AuthorPhoto from './AuthorPhoto.js';
import AuthorName from './AuthorName.js';

export default class ChatNewMember {
    constructor(chatItem) {
        this._chatItem = chatItem;
    }

    render() {
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
                        (new AuthorPhoto(this._chatItem.authorPhotoUrl)).render(),
                        (new AuthorName(this._chatItem)).render(),
                    ]
                },
                {
                    E: 'div',
                    className: 'chat-new-member-body',
                    C: (new MessageParts(this._chatItem.messageParts)).render()
                }
            ],
        };
    }
}
