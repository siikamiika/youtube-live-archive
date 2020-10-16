(async () => {
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
            for (const chatMessageElement of this._chatElement.querySelectorAll('.chat-message')) {
                if (chatMessageElement.dataset.id === messageId) { break; }
                this._chatElement.removeChild(chatMessageElement);
            }
        }

        _renderChatItem(chatItem) {
            const createElement = (name, properties={}) => {
                const element = document.createElement(name);
                Object.assign(element, properties);
                return element;
            };

            if (chatItem.type === 'CHAT_MESSAGE_NORMAL') {
                const chatMessageElement = createElement('div', {classList: ['chat-message']});
                chatMessageElement.dataset.id = chatItem.id;
                chatMessageElement.appendChild(createElement('span', {
                    textContent: chatItem.author,
                    classList: ['chat-message-author-name'],
                }));
                chatMessageElement.appendChild(createElement('span', {
                    textContent: chatItem.textParts.join(''),
                    classList: ['chat-message-body'],
                }));
                return chatMessageElement;
            }

            if (chatItem.type === 'CHAT_MESSAGE_PAID') {
                // TODO paid amount
                const chatMessageElement = createElement('div', {classList: ['chat-message']});
                chatMessageElement.dataset.id = chatItem.id;
                chatMessageElement.appendChild(createElement('span', {
                    textContent: chatItem.author,
                    classList: ['chat-message-author-name'],
                }));
                chatMessageElement.appendChild(createElement('span', {
                    textContent: chatItem.textParts.join(''),
                    classList: ['chat-message-body'],
                }));
                return chatMessageElement;
            }

            // TODO other types
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
                        author: renderer.authorName.simpleText,
                        textParts: transformMessageRuns(renderer.message.runs),
                    };
                } else if (chatAction.liveChatPaidMessageRenderer) {
                    // TODO paid amount
                    const renderer = chatAction.liveChatPaidMessageRenderer;
                    yield {
                        type: 'CHAT_MESSAGE_PAID',
                        id: renderer.id,
                        author: renderer.authorName.simpleText,
                        textParts: transformMessageRuns(renderer.message.runs),
                        paidText: renderer.purchaseAmountText.simpleText,
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
            for await (const chatItem of this._getRange(currentTimeMs - 15000, currentTimeMs)) {
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
