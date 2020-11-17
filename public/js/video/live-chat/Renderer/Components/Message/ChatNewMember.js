import Component from '/js/DomComponents/Component.js';
import MessageParts from '../MessageParts.js';
import AuthorPhoto from '../AuthorPhoto.js';
import AuthorName from '../AuthorName.js';
import {convertArgbIntRgbaCss} from '/js/helpers/css.js';

export default class ChatNewMember extends Component {
    constructor(chatItem, settings={}) {
        super();
        this._chatItem = chatItem;
        this._settings = {
            bgOpacity: settings.bgOpacity ?? 0xff << 24,
        };
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
                    style: {backgroundColor: convertArgbIntRgbaCss(0x0f9d58 | this._settings.bgOpacity)},
                    C: [
                        AuthorPhoto.create(this._chatItem.authorPhotoUrl).element,
                        AuthorName.create(this._chatItem).element,
                    ]
                },
                {
                    E: 'div',
                    className: 'chat-new-member-body',
                    style: {backgroundColor: convertArgbIntRgbaCss(0x0f9d58 | this._settings.bgOpacity)},
                    C: MessageParts.create(this._chatItem.messageParts).element,
                }
            ],
        };
    }
}
