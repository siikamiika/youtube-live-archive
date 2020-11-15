import ChatMessageNormal from './ChatMessageNormal.js';
import ChatMessagePaid from './ChatMessagePaid.js';
import ChatNewMember from './ChatNewMember.js';
import ChatStickerPaid from './ChatStickerPaid.js';

export default class ChatMessage {
    static create(chatItem) {
        switch (chatItem.type) {
            case 'CHAT_MESSAGE_NORMAL': return new ChatMessageNormal(chatItem);
            case 'CHAT_MESSAGE_PAID': return new ChatMessagePaid(chatItem);
            case 'CHAT_NEW_MEMBER': return new ChatNewMember(chatItem);
            case 'CHAT_STICKER_PAID': return new ChatStickerPaid(chatItem);
            default: return null;
        }
    }
}
