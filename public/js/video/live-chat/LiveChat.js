import LiveChatRenderer from './Renderer/LiveChatRenderer.js';
import ChatDataApi from './ChatDataApi.js';

export default class LiveChat {
    constructor(url, videoElement, chatContainer, channelId) {
        this._videoElement = videoElement;
        this._chatDataApi = new ChatDataApi(url, channelId);
        this._renderer = new LiveChatRenderer(
            chatContainer,
            videoElement,
            this._chatDataApi.getPreviousChatMessagesReverse.bind(this._chatDataApi),
        );
    }

    async updateLiveChat() {
        const currentTimeMs = this._videoElement.currentTime * 1000;
        await this._chatDataApi.fetchNewChatItems(currentTimeMs);
        this._renderer.renderMessages(this._chatDataApi.getChatMessages(currentTimeMs));
        this._renderer.renderTickers(this._chatDataApi.getChatTickers(currentTimeMs));
        this._renderer.renderBanners(this._chatDataApi.getBanners(currentTimeMs));
    }
}
