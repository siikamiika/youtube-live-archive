(async () => {
    function buildDom(object, targetObject) {
        /* Builds a DOM element out of an object of the format
         * {E: 'tag',
         *   attr: 'attribute value',
         *   C: [
         *     {E: 'childtag', attr: 'child attribute'},
         *     {E: 'childtag', C: 'C: element is the same as C: [element]}'
         *     'strings are shorthand for document.createTextNode',
         *     document.createElement('span'),
         *     'the above works as well'
         *   ]
         * }
         *
         * If some object is given the key K, the result is another object that has a key
         * for each value of K in the input object. Behind the key is a reference to the
         * new DOM element. For example:
         * {K: 'tagElement', E: 'tag',
         *   C: [
         *     {K: 'spanElement', E: 'span'}
         *   ]
         * }
         * --> {tagElement: <DOM element <tag>>, spanElement: <DOM element <span>>}
         *
         * If the targetObject argument is given, the elements are added to it instead,
         * and the parent element is returned. Useful with `this`.
         */

        if (typeof object === 'string') {
            return document.createTextNode(object);
        } else if (object instanceof HTMLElement || object instanceof Text) {
            return object;
        }

        let element = document.createElement(object.E); // E for element
        let elementObject = {}; // has 0 or more elements behind keys

        if (object.K) { // K for key
            elementObject[object.K] = element;
        }

        // add props to the DOM element
        for (let key in object) {
            if (['K', 'E', 'C'].includes(key)) { // skip buildDom specific syntax
                continue;
            } else if (/^on[a-z]+$/i.test(key)) { // onclick and such
                // onclick --> click
                let listener = key.match(/on(.+)/i)[1];
                // support both `onclick: _ => 'foo'` and `onclick: [_ => 'foo', _ => 'bar']`
                let functions = object[key] instanceof Array ? object[key] : [object[key]];
                for (let fun of functions) {
                    element.addEventListener(listener, fun);
                }
            } else if (Object.getPrototypeOf(object[key]) === Object.prototype) { // required by style and dataset
                for (let subkey in object[key]) {
                    element[key][subkey] = object[key][subkey];
                }
            } else { // anything else such as src or href
                element[key] = object[key];
            }
        }

        for (let child of object.C instanceof Array && object.C || // C for children
                                         object.C && [object.C] || // only one child
                                         []) {                     // no children
            let result = buildDom(child, elementObject); // recursive
            element.appendChild(result);
        }

        if (Object.keys(elementObject).length) { // one or more K was given
            if (targetObject) { // add elementObject content to targetObject and return the parent element
                for (let key in elementObject) {
                    targetObject[key] = elementObject[key];
                }
            } else {
                return elementObject;
            }
        }

        return element;
    }

    class LiveChatRenderer {
        constructor(chatContainer, videoElement, getPreviousChatMessagesReverse) {
            this._chatElement = chatContainer.querySelector('#live-chat-messages');
            this._tickerElement = chatContainer.querySelector('#live-chat-tickers');
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

            const firstId = this._chatElement.firstChild?.dataset?.id;
            const firstOffset = Number(this._chatElement.firstChild?.dataset?.offset);

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
                    ticker.remove();
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
            for (const chatMessageElement of this._chatElement.querySelectorAll('.chat-message, .chat-new-member')) {
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
                        {E: 'span', className: 'chat-message-timestamp', C: this._formatOffsetTime(chatItem.offset)},
                        this._renderAuthorName(chatItem),
                        {E: 'span', className: 'chat-message-body', C: chatItem.messageParts.map(this._renderMessagePart.bind(this))},
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
                            C: this._renderAuthorName(chatItem)
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
                        C: chatItem.messageParts.map(this._renderMessagePart.bind(this))
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
                            C: this._renderAuthorName(chatItem)
                        },
                        {
                            E: 'div',
                            C: chatItem.messageParts.map(this._renderMessagePart.bind(this))
                        }
                    ],
                });
            }

            // TODO other types
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

        _renderMessagePart(part) {
            if (part.text) {
                return part.text;
            }

            if (part.emoji) {
                return {
                    E: 'div',
                    className: 'chat-emoji-container',
                    C: {
                        E: 'img',
                        className: 'chat-emoji',
                        src: part.emoji.url,
                        alt: part.emoji.name,
                        title: part.emoji.name,
                    }
                };
            }
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
                                    C: {
                                        E: 'span',
                                        className: 'chat-ticker-paid-amount',
                                        style: {color: this._convertArgbIntRgbaCss(chatItem.amountColor)},
                                        C: chatItem.paidAmount
                                    }
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
                                    C: {
                                        E: 'span',
                                        className: 'chat-ticker-member-text',
                                        style: {color: this._convertArgbIntRgbaCss(chatItem.textColor)},
                                        C: chatItem.textParts.map(this._renderMessagePart.bind(this))
                                    }
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
            for (const otherTicker of this._tickerElement.querySelectorAll('.chat-ticker-wrapper')) {
                if (Number(otherTicker.dataset.offset) > Number(ticker.dataset.offset)) { continue; }
                otherTicker.before(ticker);
                return;
            }
            this._tickerElement.appendChild(ticker);
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

        _convertArgbIntRgbaCss(color) {
            const b = color & 0xff;
            const g = (color >> 8) & 0xff;
            const r = (color >> 16) & 0xff;
            const a = ((color >> 24) & 0xff) / 0xff;
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        }

        _formatOffsetTime(offset) {
            const h = Math.floor(offset / 3600000);
            offset = offset % 3600000;
            const m = Math.floor(offset / 60000);
            offset = offset % 60000;
            const s = Math.floor(offset / 1000);

            if (h > 0) {
                return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }
            return `${m}:${String(s).padStart(2, '0')}`;
        }
    }

    class YoutubeLiveChatParser {
        // TODO move to backend
        *parse(data) {
            const offset = Number(data?.replayChatItemAction?.videoOffsetTimeMsec);
            for (const action of data?.replayChatItemAction?.actions || []) {
                if (!action) { continue; }

                if (action.addChatItemAction?.item) {
                    yield* this._parseAddChatItemAction(action.addChatItemAction?.item, offset);
                } else if (action.addLiveChatTickerItemAction?.item) {
                    yield* this._parseAddLiveChatTickerItemAction(action.addLiveChatTickerItemAction.item, offset);
                } else {
                    throw new Error('Unknown chat action: ' + JSON.stringify(action));
                }
            }
        }

        *_parseAddChatItemAction(item, offset) {
            if (item.liveChatTextMessageRenderer) {
                const renderer = item.liveChatTextMessageRenderer;
                yield {
                    type: 'CHAT_MESSAGE_NORMAL',
                    id: renderer.id,
                    authorChannelId: renderer.authorExternalChannelId,
                    authorName: renderer.authorName.simpleText,
                    messageParts: renderer.message ? renderer.message.runs.map(this._transformMessageRun.bind(this)) : [],
                    badges: this._parseBadges(renderer),
                    offset,
                };
            } else if (item.liveChatPaidMessageRenderer) {
                const renderer = item.liveChatPaidMessageRenderer;
                yield {
                    type: 'CHAT_MESSAGE_PAID',
                    id: renderer.id,
                    authorChannelId: renderer.authorExternalChannelId,
                    authorName: renderer.authorName.simpleText,
                    messageParts: renderer.message ? renderer.message.runs.map(this._transformMessageRun.bind(this)) : [],
                    paidAmount: renderer.purchaseAmountText.simpleText,
                    headerBgColor: renderer.headerBackgroundColor,
                    headerFgColor: renderer.headerTextColor,
                    bodyBgColor: renderer.bodyBackgroundColor,
                    bodyFgColor: renderer.bodyTextColor,
                    authorNameColor: renderer.authorNameTextColor,
                    badges: this._parseBadges(renderer),
                    offset,
                };
            } else if (item.liveChatMembershipItemRenderer) {
                const renderer = item.liveChatMembershipItemRenderer;
                yield {
                    type: 'CHAT_NEW_MEMBER',
                    id: renderer.id,
                    authorChannelId: renderer.authorExternalChannelId,
                    authorName: renderer.authorName.simpleText,
                    messageParts: renderer.headerSubtext ? renderer.headerSubtext.runs.map(this._transformMessageRun.bind(this)) : [],
                    badges: this._parseBadges(renderer),
                    offset,
                };
            } else if (item.liveChatPaidStickerRenderer) {
                const renderer = item.liveChatPaidStickerRenderer;
                // TODO
            } else if (item.liveChatViewerEngagementMessageRenderer) {
                // not meaningful for archival
                return;
            } else if (item.liveChatPlaceholderItemRenderer) {
                // not meaningful for archival
                return;
            } else {
                throw new Error('Unknown chat item renderer: ' + JSON.stringify(item));
            }
        }

        *_parseAddLiveChatTickerItemAction(item, offset) {
            if (item.liveChatTickerPaidMessageItemRenderer) {
                const renderer = item.liveChatTickerPaidMessageItemRenderer;
                if (renderer.durationSec !== renderer.fullDurationSec) {
                    throw new Error('Unexpected duration mismatch');
                }
                yield {
                    type: 'CHAT_TICKER_MESSAGE_PAID',
                    id: renderer.id,
                    paidAmount: renderer.amount.simpleText,
                    amountColor: renderer.amountTextColor,
                    startBgColor: renderer.startBackgroundColor,
                    endBgColor: renderer.endBackgroundColor,
                    duration: renderer.fullDurationSec,
                    expandedMessage: this._parseAddChatItemAction(renderer.showItemEndpoint.showLiveChatItemEndpoint.renderer, offset).next()?.value,
                    offset,
                };
            } else if (item.liveChatTickerSponsorItemRenderer) {
                const renderer = item.liveChatTickerSponsorItemRenderer;
                yield {
                    type: 'CHAT_TICKER_NEW_MEMBER',
                    id: renderer.id,
                    textParts: renderer.detailText ? renderer.detailText.runs.map(this._transformMessageRun.bind(this)) : [],
                    textColor: renderer.detailTextColor,
                    startBgColor: renderer.startBackgroundColor,
                    endBgColor: renderer.endBackgroundColor,
                    duration: renderer.fullDurationSec,
                    expandedMessage: this._parseAddChatItemAction(renderer.showItemEndpoint.showLiveChatItemEndpoint.renderer, offset).next()?.value,
                    offset,
                };
            } else if (item.liveChatTickerPaidStickerItemRenderer) {
                const renderer = item.liveChatTickerPaidStickerItemRenderer;
                // TODO
            } else {
                throw new Error('Unknown chat ticker renderer: ' + JSON.stringify(item));
            }
        }

        _transformMessageRun(run) {
            if (run.text) {
                return {text: run.text};
            }

            if (run.emoji) {
                return {
                    emoji: {
                        url: '/storage/images/live_chat_emoji/' + app.channelId + '/' + run.emoji.emojiId.split('/')[1] + '.png',
                        name: run.emoji.shortcuts[0],
                    }
                };
            }
        }

        _parseBadges(renderer) {
            if (!renderer.authorBadges) {
                return [];
            }

            const badges = [];
            for (const badge of renderer.authorBadges) {
                const badgeRenderer = badge.liveChatAuthorBadgeRenderer;

                if (badgeRenderer.icon) {
                    const icon = badgeRenderer.icon;
                    if (icon.iconType === 'OWNER') {
                        badges.push({type: 'owner'});
                    }
                    if (icon.iconType === 'MODERATOR') {
                        badges.push({type: 'moderator'});
                    }
                    if (icon.iconType === 'VERIFIED') {
                        badges.push({type: 'verified'});
                    }
                } else if (badgeRenderer.customThumbnail) {
                    let duration = null;
                    if (/New member/.test(badgeRenderer.tooltip)) {
                        duration = 0;
                    } else {
                        const m = /Member \((?:(\d+) years?\, (\d+) months?)|(?:(\d+) years?)|(?:(\d+) months?)\)/.exec(badgeRenderer.tooltip);
                        if (!m) {
                            throw new Error('Cannot parse member badge duration');
                        }

                        if (m[1]) {
                            duration = 12 * m[1] + 1 * m[2];
                        } else if (m[3]) {
                            duration = 12 * m[3];
                        } else if (m[4]) {
                            duration = 1 * m[4];
                        }
                    }

                    let url = null;
                    for (const d of [24, 12, 6, 2, 1, 0]) {
                        if (d <= duration) {
                            url = '/storage/images/live_chat_sponsor_badges/' + app.channelId + '/' + d + '.png';
                            break;
                        }
                    }

                    badges.push({type: 'sponsor', duration, url});
                }
            }

            return badges;
        }
    }

    class TimeRangeCache {
        constructor(getStart, getEnd) {
            this._getStart = getStart;
            this._getEnd = getEnd;
            this._itemsByLengthRange = {};
        }

        // must add items in order
        add(item) {
            const start = this._getStart(item);
            const end = this._getEnd(item);
            const length = end - start;

            let lengthRangeKey = 1;
            while ((lengthRangeKey *= 2) < length) { }

            if (!this._itemsByLengthRange[lengthRangeKey]) {
                this._itemsByLengthRange[lengthRangeKey] = [];
            }

            this._itemsByLengthRange[lengthRangeKey].push({start, end, item});
        }

        *get(time) {
            for (const [lengthRangeKey, itemsInRange] of Object.entries(this._itemsByLengthRange)) {
                const startIndex = this._findIndex(itemsInRange, time - lengthRangeKey);
                for (let i = startIndex; i < itemsInRange.length; i++) {
                    const {start, end, item} = itemsInRange[i];
                    if (start > time) { break; }
                    if (end <= time) { continue; }
                    yield item;
                }
            }
        }

        // should always have at least 1 element
        _findIndex(array, value) {
            let lo = 0;
            let hi = array.length - 1;
            while (lo !== hi) {
                const mid = Math.ceil((lo + hi) / 2);
                const mValue = array[mid].start;
                if (mValue > value) {
                    hi = mid - 1;
                } else {
                    lo = mid;
                }
            }
            return lo;
        }
    }

    class LiveChat {
        constructor(url, videoElement, chatContainer) {
            this._url = url;
            this._videoElement = videoElement;
            this._parser = new YoutubeLiveChatParser();
            this._renderer = new LiveChatRenderer(chatContainer, videoElement, this._getPreviousChatMessagesReverse.bind(this));
            this._messageCache = [];
            this._tickerCache = new TimeRangeCache(
                (item) => item.offset,
                (item) => item.offset + item.duration * 1000,
            );
            this._lineIterator = this._iterateLines();
        }

        async updateLiveChat() {
            const currentTimeMs = this._videoElement.currentTime * 1000;
            await this._fetchNewChatItems(currentTimeMs);
            this._renderer.renderMessages(this._getChatMessages(currentTimeMs));
            this._renderer.renderTickers(this._getChatTickers(currentTimeMs));
        }

        // https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader/read
        async *_iterateLines() {
            const utf8Decoder = new TextDecoder("utf-8");
            let response = await fetch(this._url);
            let reader = response.body.getReader();
            let {value: chunk, done: readerDone} = await reader.read();
            chunk = chunk ? utf8Decoder.decode(chunk) : "";

            let re = /\r\n|\n|\r/gm;
            let startIndex = 0;
            let result;

            for (;;) {
                let result = re.exec(chunk);
                if (!result) {
                    if (readerDone) {
                        break;
                    }
                    let remainder = chunk.substr(startIndex);
                    ({value: chunk, done: readerDone} = await reader.read());
                    chunk = remainder + (chunk ? utf8Decoder.decode(chunk) : "");
                    startIndex = re.lastIndex = 0;
                    continue;
                }
                yield chunk.substring(startIndex, result.index);
                startIndex = re.lastIndex;
            }
            if (startIndex < chunk.length) {
                // last line didn't end in a newline char
                yield chunk.substr(startIndex);
            }
        }

        async _fetchNewChatItems(time) {
            if (this._messageCache.length === 0 || this._messageCache[this._messageCache.length - 1].offset < time) {
                for (;;) {
                    const {value, done} = await this._lineIterator.next();
                    if (done) { break; }
                    let lastChatItem = null;
                    for (const chatItem of this._parser.parse(JSON.parse(value))) {
                        this._cacheChatItem(chatItem);
                        lastChatItem = chatItem;
                    }
                    if (lastChatItem && lastChatItem.offset > time) { break; }
                }
            }
        }

        _cacheChatItem(chatItem) {
            switch (chatItem.type) {
                case 'CHAT_MESSAGE_NORMAL':
                case 'CHAT_MESSAGE_PAID':
                case 'CHAT_NEW_MEMBER':
                    this._messageCache.push(chatItem);
                    break;
                case 'CHAT_TICKER_MESSAGE_PAID':
                case 'CHAT_TICKER_NEW_MEMBER':
                    this._tickerCache.add(chatItem);
                    break;
            }
        }

        *_getChatMessages(time, nPrevious=100) {
            const chatItems = [];
            let index = this._findChatIndex(time);
            while (chatItems.length < nPrevious && index >= 0) {
                chatItems.push(this._messageCache[index]);
                index--;
            }
            for (let i = chatItems.length - 1; i >= 0; i--) {
                yield chatItems[i];
            }
        }

        *_getPreviousChatMessagesReverse(time, nPrevious, currentId) {
            const startIndex = this._findChatIndex(time + 1); // in case there are many
            let previousIdFound = false;
            for (let i = startIndex; i > startIndex - nPrevious && i >= 0; i--) {
                const chatItem = this._messageCache[i];
                if (!previousIdFound) {
                    if (chatItem.id === currentId) {
                        previousIdFound = true;
                    }
                    continue;
                }
                yield chatItem;
            }
        }

        _findChatIndex(time) {
            let lo = 0;
            let hi = this._messageCache.length - 1;
            while (lo !== hi) {
                const mid = Math.ceil((lo + hi) / 2);
                const offset = this._messageCache[mid].offset;
                if (offset > time) {
                    hi = mid - 1;
                } else {
                    lo = mid;
                }
            }
            return lo;
        }

        *_getChatTickers(time) {
            yield* this._tickerCache.get(time);
        }
    }

    if (!app.liveChatResource) {
        return;
    }

    const videoElement = document.querySelector('#video');
    const liveChatContainer = document.querySelector('#live-chat');

    const liveChat = new LiveChat(app.liveChatResource, videoElement, liveChatContainer);

    let liveChatIntervalId = null;

    videoElement.addEventListener('playing', (event) => {
        clearInterval(liveChatIntervalId);
        liveChatIntervalId = setInterval(() => liveChat.updateLiveChat(), 100);
    });

    videoElement.addEventListener('pause', (event) => {
        clearInterval(liveChatIntervalId);
    });
})();
