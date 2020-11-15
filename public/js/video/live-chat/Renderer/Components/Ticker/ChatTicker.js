import ChatTickerMessagePaid from './ChatTickerMessagePaid.js';
import ChatTickerNewMember from './ChatTickerNewMember.js';

export default class ChatMessage {
    static create(chatItem, onClick) {
        switch (chatItem.type) {
            case 'CHAT_TICKER_MESSAGE_PAID': return ChatTickerMessagePaid.create(chatItem, onClick);
            case 'CHAT_TICKER_NEW_MEMBER': return ChatTickerNewMember.create(chatItem, onClick);
            default: return null;
        }
    }
}
