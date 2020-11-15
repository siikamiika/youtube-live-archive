import Component from '/js/DomComponents/Component.js';
import ChatMessage from '../Message/ChatMessage.js';

export default class ChatMessageBullet extends Component {
    constructor(chatItem) {
        super();
        this._chatItem = chatItem;
        this._animation = null;
    }

    animate() {
        if (!this._animation) {
            const {width} = this.element.getBoundingClientRect();
            const containerElement = this.element.closest('#danmaku-container');
            const {width: containerWidth} = containerElement.getBoundingClientRect();
            const xFrom = containerWidth + width;
            const xTo = -width;
            this._animation = this.element.animate(
                [{transform: `translateX(${xFrom}px) scale(1.5)`}, {transform: `translateX(${xTo}px) scale(1.5)`}],
                {fill: 'both', duration: 8000}
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
