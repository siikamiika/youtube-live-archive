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
            this._animation = this.element.animate(
                [{transform: 'translateX(100%) scale(1.5)'}, {transform: 'translateX(-200%) scale(1.5)'}],
                {fill: 'both', duration: 8000, composite: 'add'}
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
        return {
            E: 'div',
            dataset: {id: this._chatItem.id, offset: this._chatItem.offset},
            className: 'chat-bullet',
            style: {top: position + 'px'},
            C: ChatMessage.create(this._chatItem).element,
        };
    }
}
