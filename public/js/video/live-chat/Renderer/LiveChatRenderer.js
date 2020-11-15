import buildDom from '/js/helpers/build-dom.js';
import MessageParts from './MessageParts.js';

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

            const chatMessageElement = this._renderChatItem(chatItem);
            if (!chatMessageElement) { continue; }
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
            const chatMessageElement = this._renderChatItem(chatItem);
            if (!chatMessageElement) { continue; }
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

            const tickerElement = this._renderTicker(chatItem);
            if (!tickerElement) { continue; }
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

            const bannerElement = this._renderBanner(chatItem);
            if (!bannerElement) { continue; }
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

    _renderChatItem(chatItem) {
        if (chatItem.type === 'CHAT_MESSAGE_NORMAL') {
            return buildDom({
                E: 'div',
                className: 'chat-message chat-message-normal',
                dataset: {id: chatItem.id, offset: chatItem.offset},
                C: [
                    this._renderAuthorPhoto(chatItem),
                    {E: 'span', className: 'chat-message-timestamp', C: this._formatOffsetTime(chatItem.offset)},
                    this._renderAuthorName(chatItem),
                    {E: 'span', className: 'chat-message-body', C: (new MessageParts(chatItem.messageParts)).render()},
                ],
            });
        }

        if (chatItem.type === 'CHAT_MESSAGE_PAID') {
            const header = {
                E: 'div',
                className: 'chat-message-paid-header',
                style: {
                    color: this._convertArgbIntRgbaCss(chatItem.headerFgColor),
                    backgroundColor: this._convertArgbIntRgbaCss(chatItem.headerBgColor),
                },
                C: [
                    {
                        E: 'div',
                        C: [
                            this._renderAuthorPhoto(chatItem),
                            this._renderAuthorName(chatItem),
                        ]
                    },
                    {
                        E: 'div',
                        C: {E: 'span', className: 'chat-message-paid-amount', C: chatItem.paidAmount}
                    }
                ]
            };

            const body = {
                E: 'div',
                className: 'chat-message-paid-body',
                style: {
                    color: this._convertArgbIntRgbaCss(chatItem.bodyFgColor),
                    backgroundColor: this._convertArgbIntRgbaCss(chatItem.bodyBgColor),
                },
                C: {
                    E: 'span',
                    className: 'chat-message-body',
                    style: {color: this._convertArgbIntRgbaCss(chatItem.bodyFgColor)},
                    C: (new MessageParts(chatItem.messageParts)).render()
                }
            };

            return buildDom({
                E: 'div',
                className: 'chat-message chat-message-paid',
                dataset: {id: chatItem.id, offset: chatItem.offset},
                C: [header, body],
            });
        }

        if (chatItem.type === 'CHAT_NEW_MEMBER') {
            return buildDom({
                E: 'div',
                className: 'chat-new-member',
                dataset: {id: chatItem.id, offset: chatItem.offset},
                C: [
                    {
                        E: 'div',
                        className: 'chat-new-member-header',
                        C: [
                            this._renderAuthorPhoto(chatItem),
                            this._renderAuthorName(chatItem),
                        ]
                    },
                    {
                        E: 'div',
                        className: 'chat-new-member-body',
                        C: (new MessageParts(chatItem.messageParts)).render()
                    }
                ],
            });
        }

        if (chatItem.type === 'CHAT_STICKER_PAID') {
            return buildDom({
                E: 'div',
                className: 'chat-sticker-paid',
                style: {backgroundColor: this._convertArgbIntRgbaCss(chatItem.bgColor)},
                dataset: {id: chatItem.id, offset: chatItem.offset},
                C: [
                    {
                        E: 'div',
                        className: 'chat-sticker-paid-info',
                        C: [
                            {
                                E: 'div',
                                style: {color: this._convertArgbIntRgbaCss(chatItem.authorNameColor)},
                                C: [
                                    this._renderAuthorPhoto(chatItem),
                                    this._renderAuthorName(chatItem),
                                ]
                            },
                            {
                                E: 'div',
                                C: {
                                    E: 'span',
                                    className: 'chat-sticker-paid-amount',
                                    style: {color: this._convertArgbIntRgbaCss(chatItem.moneyFgColor)},
                                    C: chatItem.paidAmount
                                }
                            }
                        ]
                    },
                    {
                        E: 'div',
                        className: 'chat-sticker-paid-body',
                        C: {
                            E: 'img',
                            className: 'chat-sticker-paid-image',
                            style: {width: `${chatItem.stickerWidth}px`, height: `${chatItem.stickerHeight}px`},
                            src: chatItem.stickerUrl,
                            alt: chatItem.stickerDescription,
                            title: chatItem.stickerDescription,
                        }
                    }
                ],
            });
        }
    }

    _renderAuthorName(chatItem) {
        let isSponsor = false;
        let sponsorDuration = null;
        let sponsorUrl = null;
        let isOwner = false;
        let isModerator = false;
        let isVerified = false;

        for (const badge of chatItem.badges) {
            if (badge.type === 'sponsor') {
                isSponsor = true;
                sponsorDuration = badge.duration;
                sponsorUrl = badge.url;
            } else if (badge.type === 'owner') {
                isOwner = true;
            } else if (badge.type === 'moderator') {
                isModerator = true;
            } else if (badge.type === 'verified') {
                isVerified = true;
            }
        }

        const linkContents = [chatItem.authorName];

        const classNames = ['chat-message-author'];
        if (isSponsor) {
            classNames.push('chat-message-author-sponsor');
            linkContents.push({
                E: 'div',
                className: 'chat-message-author-sponsor-badge-container',
                C: {
                    E: 'img',
                    className: 'chat-message-author-sponsor-badge',
                    src: sponsorUrl,
                    alt: 'Sponsor badge',
                }
            });
        }
        if (isOwner) {
            classNames.push('chat-message-author-owner');
        }
        if (isModerator) {
            classNames.push('chat-message-author-moderator');
        }
        if (isVerified) {
            classNames.push('chat-message-author-verified');
        }

        const authorLink = {
            E: 'a',
            className: classNames.join(' '),
            href: `https://www.youtube.com/channel/${encodeURIComponent(chatItem.authorChannelId)}`,
            rel: 'noopener noreferrer',
            target: '_blank',
            C: linkContents,
        };

        if (sponsorDuration !== null) {
            authorLink.title = sponsorDuration === 0
                ? 'New member'
                : `Member (${sponsorDuration} month${sponsorDuration === 1 ? '' : 's'})`;
        }

        if (chatItem.type === 'CHAT_MESSAGE_PAID') {
            authorLink.style = {color: this._convertArgbIntRgbaCss(chatItem.authorNameColor)};
        }

        return authorLink;
    }

    _renderAuthorPhoto(chatItem) {
        return {
            E: 'div',
            className: 'chat-author-photo-wrapper',
            C: {
                E: 'img',
                className: 'chat-author-photo',
                src: chatItem.authorPhotoUrl,
                alt: '',
            },
        };
    }

    _renderTicker(chatItem) {
        if (chatItem.type === 'CHAT_TICKER_MESSAGE_PAID') {
            return buildDom({
                E: 'div',
                className: 'chat-ticker-wrapper',
                dataset: {id: chatItem.id, offset: chatItem.offset},
                C: [
                    {
                        E: 'div',
                        className: 'chat-ticker-progress',
                        style: {backgroundColor: this._convertArgbIntRgbaCss(chatItem.endBgColor)},
                        onclick: this._onTickerProgressClick.bind(this),
                        C: {
                            E: 'div',
                            className: 'chat-ticker-progress-bar',
                            style: {backgroundColor: this._convertArgbIntRgbaCss(chatItem.startBgColor)},
                            C: {
                                E: 'div',
                                className: 'chat-ticker chat-ticker-message-paid',
                                C: [
                                    this._renderAuthorPhoto(chatItem),
                                    {
                                        E: 'span',
                                        className: 'chat-ticker-paid-amount',
                                        style: {color: this._convertArgbIntRgbaCss(chatItem.amountColor)},
                                        C: chatItem.paidAmount
                                    },
                                ]
                            }
                        }
                    },
                    {
                        E: 'div',
                        style: {display: 'none'},
                        className: 'chat-ticker-expanded-message-wrapper',
                        C: this._renderChatItem(chatItem.expandedMessage),
                    }
                ]
            });
        }

        if (chatItem.type === 'CHAT_TICKER_NEW_MEMBER') {
            return buildDom({
                E: 'div',
                className: 'chat-ticker-wrapper',
                dataset: {id: chatItem.id, offset: chatItem.offset},
                C: [
                    {
                        E: 'div',
                        className: 'chat-ticker-progress',
                        style: {backgroundColor: this._convertArgbIntRgbaCss(chatItem.endBgColor)},
                        onclick: this._onTickerProgressClick.bind(this),
                        C: {
                            E: 'div',
                            className: 'chat-ticker-progress-bar',
                            style: {backgroundColor: this._convertArgbIntRgbaCss(chatItem.startBgColor)},
                            C: {
                                E: 'div',
                                className: 'chat-ticker chat-ticker-new-member',
                                C: [
                                    this._renderAuthorPhoto(chatItem),
                                    {
                                        E: 'span',
                                        className: 'chat-ticker-member-text',
                                        style: {color: this._convertArgbIntRgbaCss(chatItem.textColor)},
                                        C: (new MessageParts(chatItem.textParts)).render()
                                    },
                                ]
                            }
                        }
                    },
                    {
                        E: 'div',
                        style: {display: 'none'},
                        className: 'chat-ticker-expanded-message-wrapper',
                        C: this._renderChatItem(chatItem.expandedMessage),
                    }
                ]
            });
        }

        // TODO other types
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

    _renderBanner(chatItem) {
        if (chatItem.type === 'CHAT_BANNER') {
            return buildDom({
                E: 'div',
                className: 'chat-banner',
                dataset: {id: chatItem.id, offset: chatItem.offset, closed: false, collapsed: false},
                onclick: this._onChatBannerClick.bind(this),
                C: [
                    {
                        E: 'div',
                        className: 'chat-banner-header',
                        C: [
                            ...(new MessageParts(chatItem.headerTextParts)).render(),
                            {
                                E: 'div',
                                className: 'chat-banner-close-button',
                                onclick: this._onChatBannerCloseClick.bind(this),
                            },
                        ]
                    },
                    {
                        E: 'div',
                        className: 'chat-banner-expanded-message-wrapper',
                        C: this._renderChatItem(chatItem.expandedMessage),
                    }
                ]
            });
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

    _convertArgbIntRgbaCss(color) {
        const b = color & 0xff;
        const g = (color >> 8) & 0xff;
        const r = (color >> 16) & 0xff;
        const a = ((color >> 24) & 0xff) / 0xff;
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }

    _formatOffsetTime(offset) {
        const negative = offset < 0;
        if (negative) {
            offset *= -1;
        }
        const h = Math.floor(offset / 3600000);
        offset = offset % 3600000;
        const m = Math.floor(offset / 60000);
        offset = offset % 60000;
        const s = Math.floor(offset / 1000);

        const sign = negative ? '-' : '';
        if (h > 0) {
            return `${sign}${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        return `${sign}${m}:${String(s).padStart(2, '0')}`;
    }
}
