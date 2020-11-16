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
        if (!this._animation) {
            const {width} = this.element.getBoundingClientRect();
            const containerElement = this.element.closest('#danmaku-container');
            const {width: containerWidth} = containerElement.getBoundingClientRect();
            const xFrom = containerWidth - width * this._scale;
            const xTo = -width * this._scale;

            const videoElement = containerElement.parentElement.querySelector('#video');
            const currentTime = videoElement.currentTime * 1000;
            const delay = this._chatItem.offset - currentTime;

            this._animation = this.element.animate(
                [
                    {transform: `scale(${this._scale}) translateX(${xFrom}px)`},
                    {transform: `scale(${this._scale}) translateX(${xTo}px)`},
                ],
                {fill: 'both', duration: 8000, delay}
            );
        }
        this._animation.play();
    }

    pauseAnimation() {
        if (!this._animation) { return; }
        this._animation.pause();
    }

    _render() {
        const position = Math.floor(Math.random() * 10) * 60;

        let textShadow = '';
        if (this._chatItem.type === 'CHAT_MESSAGE_NORMAL') {
            textShadow = `1px 1px 0px black`;
        }

        return {
            E: 'div',
            dataset: {id: this._chatItem.id, offset: this._chatItem.offset},
            className: 'chat-bullet',
            style: {
                top: position + 'px',
                textShadow,
            },
            C: ChatMessage.create(this._chatItem).element,
        };
    }
}
