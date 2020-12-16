import LiveChatRenderer from './Renderer/LiveChatRenderer.js';
import DanmakuRenderer from './Renderer/DanmakuRenderer.js';
import ChatDataApi from './ChatDataApi.js';

export default class LiveChat {
    constructor(videoElement, chatContainer, danmakuContainer, videoId, channelId) {
        this._videoElement = videoElement;
        this._chatDataApi = new ChatDataApi(videoId, channelId);
        this._renderer = new LiveChatRenderer(
            chatContainer,
            videoElement,
            this._chatDataApi.getPreviousChatMessagesReverse.bind(this._chatDataApi),
        );
        this._danmakuRenderer = new DanmakuRenderer(danmakuContainer, videoElement);

        this._running = false;
        this._nextOperation = this._init.bind(this);
        this._currentOperationPromise = null;
    }

    async start() {
        if (this._running) { return; }
        console.debug('start before');
        const currentOperationPromise = this._currentOperationPromise;
        if (currentOperationPromise) {
            await currentOperationPromise;
            if (currentOperationPromise !== this._currentOperationPromise) {
                return;
            }
        }
        this._running = true;
        this._loop();
        console.debug('start after');
    }

    stop() {
        this._running = false;
        console.debug('stop');
    }

    reload() {
        this._nextOperation = this._reload.bind(this);
    }

    _loop() {
        if (!this._running) { return; }
        this._currentOperationPromise = new Promise((resolve, reject) => {
            setTimeout(async () => {
                if (!this._running) {
                    resolve();
                    return;
                }
                // TODO handle network errors
                const nextOperation = this._nextOperation;
                if (nextOperation) {
                    await this._nextOperation();
                    if (nextOperation === this._nextOperation) {
                        this._nextOperation = null;
                    }
                } else {
                    await this._update();
                }
                resolve();
                this._loop();
            }, 100);
        });
    }

    async _init() {
        if (!this._running) { return; }
        console.debug('init before');
        await this._chatDataApi.fetchInitialChatItems();
        console.debug('init after');
    }

    async _update() {
        if (!this._running) { return; }
        console.debug('update before');
        const currentTimeMs = this._videoElement.currentTime * 1000;
        await this._chatDataApi.fetchNewChatItems(currentTimeMs);
        if (!this._running) { return; }
        this._renderer.renderMessages(this._chatDataApi.getChatMessagesAmount(currentTimeMs, 100));
        this._renderer.renderTickers(this._chatDataApi.getChatTickers(currentTimeMs));
        this._renderer.renderBanners(this._chatDataApi.getBanners(currentTimeMs));
        this._danmakuRenderer.renderBullets(this._chatDataApi.getChatMessagesTimeRange(currentTimeMs, 8));
        console.debug('update after');
    }

    async _reload() {
        if (!this._running) { return; }
        console.debug('reload before');
        const currentTimeMs = this._videoElement.currentTime * 1000;
        await this._chatDataApi.fetchChatItemsAt(currentTimeMs);
        await this._chatDataApi.fetchPreviousChatItems(); // TODO do this in backend
        console.debug('reload after');
    }
}
