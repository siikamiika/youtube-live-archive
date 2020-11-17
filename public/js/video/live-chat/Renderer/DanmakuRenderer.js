import ChatMessageBullet from './Components/Bullet/ChatMessageBullet.js';

export default class DanmakuRenderer {
    constructor(danmakuContainer, videoElement) {
        this._danmakuContainer = danmakuContainer;
        this._videoElement = videoElement;

        this._videoElement.addEventListener('playing', this._onVideoPlaying.bind(this));
        this._videoElement.addEventListener('pause', this._onVideoPause.bind(this));
        window.addEventListener('resize', this._onWindowResize.bind(this));
    }

    renderBullets(events) {
        let firstChatItem = null;
        let lastId = null;
        for (const chatItem of events) {
            if (!firstChatItem) {
                firstChatItem = chatItem;
                lastId = this._danmakuContainer.lastChild?.dataset?.id;
            }
            if (lastId) {
                if (lastId === chatItem.id) {
                    lastId = null;
                }
                continue;
            }

            const chatBullet = ChatMessageBullet.create(chatItem);
            this._danmakuContainer.appendChild(chatBullet.element);
            chatBullet.animate();

            this._clearLogUntil(firstChatItem.id);
        }

        // out of sync, clear everything and start fresh
        // happens when seeking back or too much forward
        if (lastId) {
            this._clearLogUntil(null);
        }
    }

    _clearLogUntil(messageId) {
        for (const chatBulletElement of this._getBullets()) {
            if (chatBulletElement.dataset.id === messageId) { break; }
            this._danmakuContainer.removeChild(chatBulletElement);
        }
    }

    _onVideoPlaying() {
        for (const chatBulletElement of this._getBullets()) {
            const chatBullet = ChatMessageBullet.createFromElement(chatBulletElement);
            chatBullet.animate();
        }
    }

    _onVideoPause() {
        for (const chatBulletElement of this._getBullets()) {
            const chatBullet = ChatMessageBullet.createFromElement(chatBulletElement);
            chatBullet.pauseAnimation();
        }
    }

    _onWindowResize() {
        for (const chatBulletElement of this._getBullets()) {
            const chatBullet = ChatMessageBullet.createFromElement(chatBulletElement);
            chatBullet.animate();
            if (this._videoElement.paused) {
                chatBullet.pauseAnimation();
            }
        }
    }

    _getBullets() {
        return this._danmakuContainer.querySelectorAll('.chat-bullet');
    }
}
