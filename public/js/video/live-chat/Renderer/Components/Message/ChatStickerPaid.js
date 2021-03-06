import Component from '/js/DomComponents/Component.js';
import AuthorPhoto from '../AuthorPhoto.js';
import AuthorName from '../AuthorName.js';
import {convertArgbIntRgbaCss} from '/js/helpers/css.js';

export default class ChatStickerPaid extends Component {
    constructor(chatItem, settings={}) {
        super();
        this._chatItem = chatItem;
        this._settings = {
            bgOpacity: settings.bgOpacity ?? 0xff << 24,
        };
    }

    _render() {
        if (this._chatItem.type !== 'CHAT_STICKER_PAID') { throw new Error('Invalid type: ' + this._chatItem.type); }

        return {
            E: 'div',
            className: 'chat-sticker-paid',
            style: {backgroundColor: convertArgbIntRgbaCss(this._chatItem.bgColor & 0xffffff | this._settings.bgOpacity)},
            dataset: {id: this._chatItem.id, offset: this._chatItem.offset},
            C: [
                {
                    E: 'div',
                    className: 'chat-sticker-paid-info',
                    C: [
                        {
                            E: 'div',
                            style: {color: convertArgbIntRgbaCss(this._chatItem.authorNameColor)},
                            C: [
                                AuthorPhoto.create(this._chatItem.authorPhotoUrl).element,
                                AuthorName.create(this._chatItem).element,
                            ]
                        },
                        {
                            E: 'div',
                            C: {
                                E: 'span',
                                className: 'chat-sticker-paid-amount',
                                style: {color: convertArgbIntRgbaCss(this._chatItem.moneyFgColor)},
                                C: this._chatItem.paidAmount
                            }
                        }
                    ]
                },
                {
                    E: 'div',
                    className: 'chat-sticker-paid-body',
                    C: {
                        E: 'img',
                        className: 'chat-sticker-paid-image',
                        style: {width: `${this._chatItem.stickerWidth}px`, height: `${this._chatItem.stickerHeight}px`},
                        src: this._chatItem.stickerUrl,
                        alt: this._chatItem.stickerDescription,
                        title: this._chatItem.stickerDescription,
                    }
                }
            ],
        };
    }
}
