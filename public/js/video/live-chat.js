(async () => {
    class LiveChat {
        constructor(url, videoElement, chatElement) {
            this._url = url;
            this._videoElement = videoElement;
            this._chatElement = chatElement;
            this._cache = [];
            this._lineIterator = this._iterateLines();
        }

        async updateLiveChat(time) {
            // TODO use proper styling
            // TODO only update changed element
            // TODO implement buffer size
            // TODO move to another class
            const currentTimeMs = this._videoElement.currentTime * 1000;
            this._chatElement.innerText = '';
            for await (const chatItem of this._getRange(currentTimeMs - 15000, currentTimeMs)) {
                for (const chatItemElement of this._renderChatItems(chatItem)) {
                    this._chatElement.appendChild(chatItemElement);
                }
            }
            this._chatElement.scrollTop = this._chatElement.scrollHeight;
        }

        *_renderChatItems(chatItem) {
            const actions = chatItem?.replayChatItemAction?.actions;
            if (!actions) { return; }
            for (const action of actions) {
                // TODO addLiveChatTickerItemAction
                const chatAction = action?.addChatItemAction?.item;
                if (!chatAction) { continue; }

                const createElement = (name, properties={}) => {
                    const element = document.createElement(name);
                    Object.assign(element, properties);
                    return element;
                };

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
                    return newRuns.join('');
                };

                if (chatAction.liveChatTextMessageRenderer) {
                    const renderer = chatAction.liveChatTextMessageRenderer;
                    const chatMessageElement = createElement('div', {classList: ['chat-message']});
                    chatMessageElement.appendChild(createElement('span', {
                        textContent: renderer?.authorName?.simpleText ?? '',
                        classList: ['chat-message-author-name'],
                    }));
                    chatMessageElement.appendChild(createElement('span', {
                        textContent: transformMessageRuns(renderer.message.runs),
                        classList: ['chat-message-body'],
                    }));
                    yield chatMessageElement;
                } else if (chatAction.liveChatPaidMessageRenderer) {
                    // TODO paid amount
                    const renderer = chatAction.liveChatPaidMessageRenderer;
                    const chatMessageElement = createElement('div', {classList: ['chat-message']});
                    chatMessageElement.appendChild(createElement('span', {
                        textContent: renderer?.authorName?.startIndex ?? '',
                        classList: ['chat-message-author-name'],
                    }));
                    chatMessageElement.appendChild(createElement('span', {
                        textContent: transformMessageRuns(renderer.message?.runs ?? []),
                        classList: ['chat-message-body'],
                    }));
                    yield chatMessageElement;
                } else if (chatAction.liveChatMembershipItemRenderer) {
                    const renderer = chatAction.liveChatMembershipItemRenderer;
                    // TODO
                }
            }
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
                if (offset > start) {
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

    setInterval(() => liveChat.updateLiveChat(), 2000);
})();
