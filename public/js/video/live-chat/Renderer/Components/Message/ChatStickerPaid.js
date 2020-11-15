import AuthorPhoto from '../AuthorPhoto.js';
import AuthorName from '../AuthorName.js';
import {convertArgbIntRgbaCss} from '/js/helpers/css.js';

export default class ChatStickerPaid {
    constructor(chatItem) {
        this._chatItem = chatItem;
    }

    render() {
        if (this._chatItem.type !== 'CHAT_STICKER_PAID') { throw new Error('Invalid type: ' + this._chatItem.type); }

        return {
            E: 'div',
            className: 'chat-sticker-paid',
            style: {backgroundColor: convertArgbIntRgbaCss(this._chatItem.bgColor)},
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
                                (new AuthorPhoto(this._chatItem.authorPhotoUrl)).render(),
                                (new AuthorName(this._chatItem)).render(),
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
