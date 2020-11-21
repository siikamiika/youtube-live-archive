import ChatMessageBullet from './Components/Bullet/ChatMessageBullet.js';
import DanmakuLayer from './DanmakuLayer.js';

export default class DanmakuRenderer {
    constructor(danmakuContainer, videoElement) {
        this._videoElement = videoElement;

        this._danmakuLayer = new DanmakuLayer(
            danmakuContainer,
            () => this._videoElement.currentTime * 1000,
            8000,
            10
        );

        this._videoElement.addEventListener('playing', this._onVideoPlaying.bind(this));
        this._videoElement.addEventListener('seeking', this._onVideoSeeking.bind(this));
        this._videoElement.addEventListener('pause', this._onVideoPause.bind(this));
        window.addEventListener('resize', this._onWindowResize.bind(this));
    }

    renderBullets(events) {
        this._danmakuLayer.garbageCollect();
        for (const chatItem of events) {
            if (this._danmakuLayer.hasBullet(chatItem.id)) { continue; }
            const bullet = ChatMessageBullet.create(chatItem, 1.5);
            this._danmakuLayer.addBullet(bullet);
        }
    }

    _onVideoPlaying() {
        this._danmakuLayer.play();
    }

    _onVideoSeeking() {
        this._danmakuLayer.garbageCollect(false);
    }

    _onVideoPause() {
        this._danmakuLayer.pause();
    }

    _onWindowResize() {
        this._danmakuLayer.play();
        if (this._videoElement.paused) {
            this._danmakuLayer.pause();
        }
    }
}
