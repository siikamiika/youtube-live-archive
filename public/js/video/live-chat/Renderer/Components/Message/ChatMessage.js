import ChatMessageNormal from './ChatMessageNormal.js';
import ChatMessagePaid from './ChatMessagePaid.js';
import ChatNewMember from './ChatNewMember.js';
import ChatStickerPaid from './ChatStickerPaid.js';

export default class ChatMessage {
    static create(chatItem) {
        switch (chatItem.type) {
            case 'CHAT_MESSAGE_NORMAL': return ChatMessageNormal.create(chatItem);
            case 'CHAT_MESSAGE_PAID': return ChatMessagePaid.create(chatItem);
            case 'CHAT_NEW_MEMBER': return ChatNewMember.create(chatItem);
            case 'CHAT_STICKER_PAID': return ChatStickerPaid.create(chatItem);
            default: return null;
        }
    }
}
