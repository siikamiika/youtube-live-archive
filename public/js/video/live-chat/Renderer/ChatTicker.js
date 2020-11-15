import ChatTickerMessagePaid from './ChatTickerMessagePaid.js';
import ChatTickerNewMember from './ChatTickerNewMember.js';

export default class ChatMessage {
    static create(chatItem, onClick) {
        switch (chatItem.type) {
            case 'CHAT_TICKER_MESSAGE_PAID': return new ChatTickerMessagePaid(chatItem, onClick);
            case 'CHAT_TICKER_NEW_MEMBER': return new ChatTickerNewMember(chatItem, onClick);
            default: return null;
        }
    }
}
