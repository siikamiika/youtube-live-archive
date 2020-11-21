import Component from '/js/DomComponents/Component.js';
import ChatMessage from '../Message/ChatMessage.js';

export default class ChatMessageBullet extends Component {
    constructor(chatItem, scale) {
        super();
        this._chatItem = chatItem;
        this._animation = null;
        this._scale = scale;
    }

    get id() {
        return this.element.dataset.id;
    }

    get offset() {
        return this.element.dataset.offset;
    }

    get width() {
        return this.element.getBoundingClientRect().width * this._scale;
    }

    animate(yPos, containerWidth, delay, duration) {
        if (this._animation) {
            this._animation.cancel();
        }

        const originalWidth = this.element.getBoundingClientRect().width;

        this._animation = this.element.animate(
            [
                {transform: `translateX(${containerWidth + originalWidth / 2}px) translateY(${yPos}px) scale(${this._scale})`},
                {transform: `translateX(${-this.width}px) translateY(${yPos}px) scale(${this._scale})`},
            ],
            {fill: 'both', duration, delay}
        );

        this._animation.play();
    }

    pauseAnimation() {
        if (!this._animation) { return; }
        this._animation.pause();
    }

    _render() {
        const settings = {};
        if (this._chatItem.type === 'CHAT_MESSAGE_NORMAL') {
            settings.textShadow = '-1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black, 1px 1px 0 black';
            settings.fontWeight = 'bold';
            settings.authorOpacity = 0.26667;
        } else {
            settings.bgOpacity = 0xbf << 24;
        }

        return {
            E: 'div',
            dataset: {id: this._chatItem.id, offset: this._chatItem.offset},
            className: 'chat-bullet',
            C: ChatMessage.create(this._chatItem, settings).element,
        };
    }
}
