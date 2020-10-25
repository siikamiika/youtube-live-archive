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
        constructor(chatElement) {
            this._chatElement = chatElement;
        }

        render(events) {
            let first = true;
            let lastId = null;
            // TODO use timeout queue or something
            for (const chatItem of events) {
                const chatMessageElement = this._renderChatItem(chatItem);
                if (first) {
                    this._clearLogUntil(chatMessageElement.dataset.id);
                    first = false;
                    lastId = this._chatElement.lastChild?.dataset?.id;
                }
                if (lastId) {
                    if (lastId === chatMessageElement.dataset.id) {
                        lastId = null;
                    }
                    continue;
                }
                this._chatElement.appendChild(chatMessageElement);
                this._chatElement.scrollTop = this._chatElement.scrollHeight;
            }
        }

        _clearLogUntil(messageId) {
            for (const chatMessageElement of this._chatElement.querySelectorAll('.chat-message, .chat-message-paid')) {
                if (chatMessageElement.dataset.id === messageId) { break; }
                this._chatElement.removeChild(chatMessageElement);
            }
        }

        _renderChatItem(chatItem) {
            if (chatItem.type === 'CHAT_MESSAGE_NORMAL') {
                return buildDom({
                    E: 'div',
                    className: 'chat-message chat-message-normal',
                    dataset: {id: chatItem.id},
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
                    dataset: {id: chatItem.id},
                    C: [header, body],
                });
            }

            // TODO other types
        }

        _renderAuthorName(chatItem) {
            let isSponsor = false;
            let sponsorDuration = null;
            let sponsorUrl = null; // TODO show badge icon
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

            const classNames = ['chat-message-author'];
            if (isSponsor) {
                classNames.push('chat-message-author-sponsor');
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
                C: chatItem.authorName,
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

            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
    }

    class YoutubeLiveChatParser {
        *parse(data) {
            const offset = Number(data?.replayChatItemAction?.videoOffsetTimeMsec);
            for (const action of data?.replayChatItemAction?.actions || []) {
                // TODO addLiveChatTickerItemAction
                const chatAction = action?.addChatItemAction?.item;
                if (!chatAction) { continue; }

                const transformMessageRun = (run) => {
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
                };

                if (chatAction.liveChatTextMessageRenderer) {
                    const renderer = chatAction.liveChatTextMessageRenderer;
                    yield {
                        type: 'CHAT_MESSAGE_NORMAL',
                        id: renderer.id,
                        authorChannelId: renderer.authorExternalChannelId,
                        authorName: renderer.authorName.simpleText,
                        messageParts: renderer.message ? renderer.message.runs.map(transformMessageRun) : [],
                        badges: this._parseBadges(renderer),
                        offset,
                    };
                } else if (chatAction.liveChatPaidMessageRenderer) {
                    const renderer = chatAction.liveChatPaidMessageRenderer;
                    yield {
                        type: 'CHAT_MESSAGE_PAID',
                        id: renderer.id,
                        authorChannelId: renderer.authorExternalChannelId,
                        authorName: renderer.authorName.simpleText,
                        messageParts: renderer.message ? renderer.message.runs.map(transformMessageRun) : [],
                        paidAmount: renderer.purchaseAmountText.simpleText,
                        headerBgColor: renderer.headerBackgroundColor,
                        headerFgColor: renderer.headerTextColor,
                        bodyBgColor: renderer.bodyBackgroundColor,
                        bodyFgColor: renderer.bodyTextColor,
                        authorNameColor: renderer.authorNameTextColor,
                        badges: this._parseBadges(renderer),
                        offset,
                    };
                } else if (chatAction.liveChatMembershipItemRenderer) {
                    const renderer = chatAction.liveChatMembershipItemRenderer;
                    // TODO
                }
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
                        const m = /Member \((?:(\d+) years?)|(?:(\d+) years?\, (\d+) months?)|(?:(\d+) months?)\)/.exec(badgeRenderer.tooltip);
                        if (!m) {
                            throw new Error('Cannot parse member badge duration');
                        }

                        if (m[1]) {
                            duration = 12 * m[1];
                        } else if (m[2]) {
                            duration = 12 * m[2] + 1 * m[3];
                        } else if (m[4]) {
                            duration = 1 * m[4];
                        }
                    }

                    let url = null;
                    for (const d of [24, 12, 6, 2, 1, 0]) {
                        if (d <= duration) {
                            url = '/storage/images/sponsor_badges/' + app.channelId + '/' + d + '.png';
                            break;
                        }
                    }

                    badges.push({type: 'sponsor', duration, url})
                }
            }

            return badges;
        }
    }

    class LiveChat {
        constructor(url, videoElement, chatElement) {
            this._url = url;
            this._videoElement = videoElement;
            this._parser = new YoutubeLiveChatParser();
            this._renderer = new LiveChatRenderer(chatElement);
            this._cache = [];
            this._lineIterator = this._iterateLines();
        }

        async updateLiveChat() {
            const currentTimeMs = this._videoElement.currentTime * 1000;
            const chatEvents = [];
            for await (const chatItem of this._getChatItems(currentTimeMs)) {
                chatEvents.push(...this._parser.parse(chatItem));
            }
            this._renderer.render(chatEvents);
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

        async *_getChatItems(time, nPrevious=100) {
            if (this._cache.length === 0 || this._chatItemOffset(this._cache[this._cache.length - 1]) < time) {
                for (;;) {
                    const {value, done} = await this._lineIterator.next();
                    if (done) { break; }
                    const chatItem = JSON.parse(value);
                    this._cache.push(chatItem);
                    if (this._chatItemOffset(chatItem) > time) { break; }
                }
            }

            let lo = 0;
            let hi = this._cache.length - 1;
            while (lo !== hi) {
                const mid = Math.ceil((lo + hi) / 2);
                const offset = this._chatItemOffset(this._cache[mid]);
                if (offset > time) {
                    hi = mid - 1;
                } else {
                    lo = mid
                }
            }

            const chatItems = [];
            let index = lo;
            while (chatItems.length < nPrevious && index >= 0) {
                chatItems.push(this._cache[index]);
                index--;
            }
            for (let i = chatItems.length - 1; i >= 0; i--) {
                yield chatItems[i];
            }
        }

        _chatItemOffset(chatItem) {
            return Number(chatItem.replayChatItemAction.videoOffsetTimeMsec);
        }
    }

    if (!app.liveChatResource) {
        return;
    }

    const videoElement = document.querySelector('#video');
    const liveChatElement = document.querySelector('#live-chat');

    const liveChat = new LiveChat(app.liveChatResource, videoElement, liveChatElement);

    let liveChatIntervalId = null;

    videoElement.addEventListener('playing', (event) => {
        clearInterval(liveChatIntervalId);
        liveChatIntervalId = setInterval(() => liveChat.updateLiveChat(), 250);
    });

    videoElement.addEventListener('pause', (event) => {
        clearInterval(liveChatIntervalId);
    });
})();
