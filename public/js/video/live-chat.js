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
                    classList: ['chat-message'],
                    dataset: {id: chatItem.id},
                    C: [
                        {E: 'span', classList: ['chat-message-author-name'], C: chatItem.authorName},
                        {E: 'span', classList: ['chat-message-body'], C: chatItem.messageParts.join('')},
                    ],
                });
            }

            if (chatItem.type === 'CHAT_MESSAGE_PAID') {
                const header = {
                    E: 'div',
                    classList: ['chat-message-paid-header'],
                    style: {
                        color: this._convertArgbIntRgbaCss(chatItem.headerFgColor),
                        backgroundColor: this._convertArgbIntRgbaCss(chatItem.headerBgColor),
                    },
                    C: [
                        {
                            E: 'div',
                            C: {
                                E: 'span',
                                classList: ['chat-message-author-name'],
                                style: {color: this._convertArgbIntRgbaCss(chatItem.authorNameColor)},
                                C: chatItem.authorName
                            }
                        },
                        {
                            E: 'div',
                            C: {E: 'span', classList: ['chat-message-paid-amount'], C: chatItem.paidAmount}
                        }
                    ]
                };

                const body = {
                    E: 'div',
                    classList: ['chat-message-paid-body'],
                    style: {
                        color: this._convertArgbIntRgbaCss(chatItem.bodyFgColor),
                        backgroundColor: this._convertArgbIntRgbaCss(chatItem.bodyBgColor),
                    },
                    C: {
                        E: 'span',
                        classList: ['chat-message-body'],
                        style: {color: chatItem.bodyFgColor},
                        C: chatItem.messageParts.join('')
                    }
                };

                return buildDom({
                    E: 'div',
                    classList: ['chat-message-paid'],
                    dataset: {id: chatItem.id},
                    C: [header, body],
                });
            }

            // TODO other types
        }

        _convertArgbIntRgbaCss(color) {
            const b = color & 0xff;
            const g = (color >> 8) & 0xff;
            const r = (color >> 16) & 0xff;
            const a = ((color >> 24) & 0xff) / 0xff;
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        }
    }

    class YoutubeLiveChatParser {
        *parse(data) {
            for (const action of data?.replayChatItemAction?.actions || []) {
                // TODO addLiveChatTickerItemAction
                const chatAction = action?.addChatItemAction?.item;
                if (!chatAction) { continue; }

                const transformMessageRuns = (runs) => {
                    const newRuns = [];
                    for (const run of runs) {
                        if (run.text) {
                            newRuns.push(run.text);
                        } else if (run.emoji) {
                            // TODO use image
                            newRuns.push(run.emoji.shortcuts[0])
                        }
                    }
                    return newRuns;
                };

                if (chatAction.liveChatTextMessageRenderer) {
                    const renderer = chatAction.liveChatTextMessageRenderer;
                    yield {
                        type: 'CHAT_MESSAGE_NORMAL',
                        id: renderer.id,
                        authorName: renderer.authorName.simpleText,
                        messageParts: transformMessageRuns(renderer.message.runs),
                    };
                } else if (chatAction.liveChatPaidMessageRenderer) {
                    const renderer = chatAction.liveChatPaidMessageRenderer;
                    yield {
                        type: 'CHAT_MESSAGE_PAID',
                        id: renderer.id,
                        authorName: renderer.authorName.simpleText,
                        messageParts: transformMessageRuns(renderer.message.runs),
                        paidAmount: renderer.purchaseAmountText.simpleText,
                        headerBgColor: renderer.headerBackgroundColor,
                        headerFgColor: renderer.headerTextColor,
                        bodyBgColor: renderer.bodyBackgroundColor,
                        bodyFgColor: renderer.bodyTextColor,
                        authorNameColor: renderer.authorNameTextColor,
                    };
                } else if (chatAction.liveChatMembershipItemRenderer) {
                    const renderer = chatAction.liveChatMembershipItemRenderer;
                    // TODO
                }
            }
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
            // TODO use proper styling
            const currentTimeMs = this._videoElement.currentTime * 1000;
            const chatEvents = [];
            for await (const chatItem of this._getRange(currentTimeMs - 30000, currentTimeMs)) {
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

        async *_getRange(start, end) {
            if (this._cache.length === 0 || this._chatItemOffset(this._cache[this._cache.length - 1]) < end) {
                for (;;) {
                    const {value, done} = await this._lineIterator.next();
                    if (done) { break; }
                    const chatItem = JSON.parse(value);
                    this._cache.push(chatItem);
                    if (this._chatItemOffset(chatItem) > end) { break; }
                }
            }

            // TODO binary search
            let prevOffset = 0;
            for (const chatItem of this._cache) {
                const offset = this._chatItemOffset(chatItem);
                if (offset > end) {
                    return;
                }
                if (offset >= start) {
                    yield chatItem;
                }
                prevOffset = offset;
            }
        }

        _chatItemOffset(chatItem) {
            return Number(chatItem.replayChatItemAction.videoOffsetTimeMsec);
        }
    }

    if (!app.liveChatResource) {
        return;
    }

    const liveChat = new LiveChat(
        app.liveChatResource,
        document.querySelector('#video'),
        document.querySelector('#live-chat'),
    );

    setInterval(() => liveChat.updateLiveChat(), 250);
})();
