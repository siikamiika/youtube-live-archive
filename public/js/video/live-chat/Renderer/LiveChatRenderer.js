import buildDom from '/js/helpers/build-dom.js';
import ChatMessage from './Components/Message/ChatMessage.js';
import ChatTicker from './Components/Ticker/ChatTicker.js';
import ChatBanner from './Components/Banner/ChatBanner.js';

export default class LiveChatRenderer {
    constructor(chatContainer, videoElement, getPreviousChatMessagesReverse) {
        this._chatElement = chatContainer.querySelector('#live-chat-messages');
        this._tickerElement = chatContainer.querySelector('#live-chat-tickers');
        this._bannerElement = chatContainer.querySelector('#live-chat-banner');
        this._videoElement = videoElement;
        this._getPreviousChatMessagesReverse = getPreviousChatMessagesReverse;

        this._wasScrolledBottom = true;
        this._resizePending = false;
        this._pastMessagesPending = false;
        window.addEventListener('resize', this._onWindowResize.bind(this));
        this._chatElement.addEventListener('scroll', this._onChatScroll.bind(this));
    }

    renderMessages(events) {
        let firstChatItem = null;
        let lastId = null;
        // TODO use timeout queue or something
        for (const chatItem of events) {
            if (!firstChatItem) {
                firstChatItem = chatItem;
                lastId = this._chatElement.lastChild?.dataset?.id;
            }
            if (lastId) {
                if (lastId === chatItem.id) {
                    lastId = null;
                }
                continue;
            }

            const chatMessage = ChatMessage.create(chatItem);
            if (!chatMessage) { continue; }
            const chatMessageElement = buildDom(chatMessage.render());
            this._chatElement.appendChild(chatMessageElement);

            if (this._wasScrolledBottom) {
                this._clearLogUntil(firstChatItem.id);
                this._scrollToBottom();
            }
        }

        // out of sync, clear everything and start fresh
        // happens when seeking back or too much forward
        if (lastId) {
            this._clearLogUntil(null);
        }
    }

    _renderPastMessages() {
        if (this._pastMessagesPending) { return; }
        this._pastMessagesPending = true;

        if (!this._chatElement.firstChild) {
            this._pastMessagesPending = false;
            return;
        }

        const firstId = this._chatElement.firstChild.dataset.id;
        const firstOffset = Number(this._chatElement.firstChild.dataset.offset);

        const containerFragment = document.createDocumentFragment();

        const eventsReverse = this._getPreviousChatMessagesReverse(firstOffset, 100, firstId);
        for (const chatItem of eventsReverse) {
            const chatMessage = ChatMessage.create(chatItem);
            if (!chatMessage) { continue; }
            const chatMessageElement = buildDom(chatMessage.render());
            containerFragment.prepend(chatMessageElement);
        }

        const topElement = containerFragment.firstChild;
        const bottomElement = containerFragment.lastChild;
        this._chatElement.prepend(containerFragment);
        if (topElement && bottomElement) {
            const {top} = topElement.getBoundingClientRect();
            const {bottom} = bottomElement.getBoundingClientRect();
            this._chatElement.scrollTop = bottom - top;
        }

        this._pastMessagesPending = false;
    }

    renderTickers(events) {
        const tickerMap = {};
        for (const chatItem of events) {
            tickerMap[chatItem.id] = {chatItem, ticker: null};
        }

        for (const ticker of this._tickerElement.querySelectorAll('.chat-ticker-wrapper')) {
            const id = ticker.dataset.id;
            if (!tickerMap[id]) {
                this._removeTicker(ticker);
                continue;
            }
            tickerMap[id].ticker = ticker;
            this._updateTickerProgress(ticker, tickerMap[id].chatItem);
        }

        for (const [_, {chatItem, ticker}] of Object.entries(tickerMap)) {
            if (ticker) { continue; }

            const ticker2 = ChatTicker.create(chatItem, this._onTickerProgressClick.bind(this));
            if (!ticker2) { continue; }
            const tickerElement = buildDom(ticker2.render());
            this._updateTickerProgress(tickerElement, chatItem);
            this._insertTicker(tickerElement);
        }
    }

    renderBanners(events) {
        // there's really only one at a time at most, but for loop is convenient
        const bannerMap = {};
        for (const chatItem of events) {
            bannerMap[chatItem.id] = {chatItem, banner: null};
        }

        for (const banner of this._bannerElement.querySelectorAll('.chat-banner')) {
            const id = banner.dataset.id;
            if (!bannerMap[id]) {
                banner.remove();
                continue;
            }
            bannerMap[id].banner = banner;
        }

        for (const [_, {chatItem, banner}] of Object.entries(bannerMap)) {
            if (banner) { continue; }

            const banner2 = new ChatBanner(
                chatItem,
                this._onChatBannerClick.bind(this),
                this._onChatBannerCloseClick.bind(this)
            );
            const bannerElement = buildDom(banner2.render());
            this._bannerElement.appendChild(bannerElement);
        }
    }

    _onWindowResize() {
        if (this._wasScrolledBottom && !this._resizePending) {
            this._resizePending = true;
            setTimeout(() => {
                this._resizePending = false;
                this._scrollToBottom();
            }, 500);
        }
    }

    _onChatScroll() {
        this._wasScrolledBottom = this._isScrolledBottom();

        if (this._isScrolledTop()) {
            this._renderPastMessages();
        }
    }

    _clearLogUntil(messageId) {
        for (const chatMessageElement of this._chatElement.querySelectorAll('.chat-message, .chat-new-member, .chat-sticker-paid')) {
            if (chatMessageElement.dataset.id === messageId) { break; }
            this._chatElement.removeChild(chatMessageElement);
        }
    }

    _scrollToBottom() {
        this._chatElement.scrollTop = this._chatElement.scrollHeight;
    }

    _isScrolledBottom() {
        const pos = this._chatElement.scrollTop;
        const height = this._chatElement.scrollHeight - this._chatElement.offsetHeight;
        return height - pos < 50;
    }

    _isScrolledTop() {
        return this._chatElement.scrollTop === 0;
    }

    _insertTicker(ticker) {
        const {left, right} = this._tickerElement.getBoundingClientRect();
        const mid = (left + right) / 2;
        for (const otherTicker of this._tickerElement.querySelectorAll('.chat-ticker-wrapper')) {
            if (Number(otherTicker.dataset.offset) > Number(ticker.dataset.offset)) { continue; }
            const {left: otherLeft} = otherTicker.getBoundingClientRect();
            otherTicker.before(ticker);
            const {right: addedRight} = ticker.getBoundingClientRect();
            if (this._tickerElement.scrollLeft > 0 && otherLeft < mid) {
                this._tickerElement.scrollLeft += Math.round(addedRight) - Math.round(otherLeft) + 5; // margin 5px
            }
            return;
        }
        this._tickerElement.appendChild(ticker);
    }

    _removeTicker(ticker) {
        const {left, right} = this._tickerElement.getBoundingClientRect();
        const mid = (left + right) / 2;
        const {right: removedRight} = ticker.getBoundingClientRect();
        const removedWidth = ticker.clientWidth + 5;
        ticker.remove();
        if (this._tickerElement.scrollLeft > 0 && removedRight < mid) {
            this._tickerElement.scrollLeft -= removedWidth;
        }
    }

    _updateTickerProgress(ticker, chatItem) {
        const currentTimeMs = this._videoElement.currentTime * 1000;
        const durationMs = chatItem.duration * 1000;
        const progress = (currentTimeMs - chatItem.offset) / durationMs;
        ticker.querySelector('.chat-ticker-progress-bar').style.width = `${(1 - progress) * 100}%`;
    }

    _onTickerProgressClick(e) {
        const expandedMessageWrapper = e.currentTarget
            .closest('.chat-ticker-wrapper')
            .querySelector('.chat-ticker-expanded-message-wrapper');

        const prevValue = expandedMessageWrapper.style.display;
        if (prevValue === 'none') {
            this._closeTickerExpandedMessages();
        }
        expandedMessageWrapper.style.display = prevValue === 'none' ? 'block' : 'none';
    }

    _closeTickerExpandedMessages() {
        const expandedMessageElements = this._tickerElement
            .querySelectorAll('.chat-ticker-expanded-message-wrapper');
        for (const expandedMessageElement of expandedMessageElements) {
            expandedMessageElement.style.display = 'none';
        }
    }

    _onChatBannerClick(e) {
        e.stopPropagation();
        e.currentTarget.dataset.collapsed = e.currentTarget.dataset.collapsed === 'false'
            ? true
            : false;
    }

    _onChatBannerCloseClick(e) {
        e.stopPropagation();
        e.currentTarget.closest('.chat-banner').dataset.closed = true;
    }
}
