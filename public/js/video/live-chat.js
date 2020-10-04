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
                const chatItemElement = document.createElement('div');
                chatItemElement.innerText = JSON.stringify(chatItem);
                this._chatElement.appendChild(chatItemElement);
            }
            this._chatElement.scrollTop = this._chatElement.scrollHeight;
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

    const liveChat = new LiveChat(
        app.liveChatResource,
        document.querySelector('#video'),
        document.querySelector('#live-chat'),
    );

    setInterval(() => liveChat.updateLiveChat(), 2000);
})();
