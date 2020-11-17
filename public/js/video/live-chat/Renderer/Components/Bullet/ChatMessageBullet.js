import Component from '/js/DomComponents/Component.js';
import ChatMessage from '../Message/ChatMessage.js';

export default class ChatMessageBullet extends Component {
    constructor(chatItem, scale=1.5) {
        super();
        this._chatItem = chatItem;
        this._animation = null;
        this._scale = scale;
    }

    animate() {
        if (this._animation) {
            this._animation.cancel();
        }

        const elementWidth = this._getElementWidth() * this._scale;
        const danmakuWidth = this._getDanmakuWidth();
        const xFrom = danmakuWidth
        const xTo = -elementWidth;

        const videoElement = document.querySelector('#video');
        const currentTime = videoElement.currentTime * 1000;
        const delay = this._chatItem.offset - currentTime;

        this._animation = this.element.animate(
            [
                {transform: `translateX(${xFrom * 100}vw) scale(${this._scale})`},
                {transform: `translateX(${xTo * 100}vw) scale(${this._scale})`},
            ],
            {fill: 'both', duration: 8000, delay}
        );

        this._animation.play();
    }

    pauseAnimation() {
        if (!this._animation) { return; }
        this._animation.pause();
    }

    _render() {
        const position = Math.floor(Math.random() * 10) * this._getDanmakuHeight() / 10;

        const settings = {};
        if (this._chatItem.type === 'CHAT_MESSAGE_NORMAL') {
            settings.bodyTextShadow = '-1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black, 1px 1px 0 black';
            settings.bodyFontWeight = 'bold';
            settings.authorOpacity = 0.5;
        } else {
            settings.bgOpacity = 0xbf << 24;
        }

        return {
            E: 'div',
            dataset: {id: this._chatItem.id, offset: this._chatItem.offset},
            className: 'chat-bullet',
            style: {top: position * 100 + 'vh'},
            C: ChatMessage.create(this._chatItem, settings).element,
        };
    }

    _getDanmakuWidth() {
        return document.querySelector('#danmaku-container').clientWidth / document.documentElement.clientWidth;
    }

    _getDanmakuHeight() {
        return document.querySelector('#danmaku-container').clientHeight / document.documentElement.clientHeight;
    }

    _getElementWidth() {
        return this.element.getBoundingClientRect().width / document.documentElement.clientWidth;
    }
}
