import ChatMessageNormal from './ChatMessageNormal.js';
import ChatMessagePaid from './ChatMessagePaid.js';
import ChatNewMember from './ChatNewMember.js';
import ChatStickerPaid from './ChatStickerPaid.js';

export default class ChatMessage {
    static create(chatItem, settings={}) {
        switch (chatItem.type) {
            case 'CHAT_MESSAGE_NORMAL': return ChatMessageNormal.create(chatItem, settings);
            case 'CHAT_MESSAGE_PAID': return ChatMessagePaid.create(chatItem, settings);
            case 'CHAT_NEW_MEMBER': return ChatNewMember.create(chatItem, settings);
            case 'CHAT_STICKER_PAID': return ChatStickerPaid.create(chatItem, settings);
            default: return null;
        }
    }

    static createFromElement(element) {
        switch (element.__component.constructor.name) {
            case 'ChatMessageNormal': return ChatMessageNormal.createFromElement(element);
            case 'ChatMessagePaid': return ChatMessagePaid.createFromElement(element);
            case 'ChatNewMember': return ChatNewMember.createFromElement(element);
            case 'ChatStickerPaid': return ChatStickerPaid.createFromElement(element);
            default: return null;
        }
    }
}
