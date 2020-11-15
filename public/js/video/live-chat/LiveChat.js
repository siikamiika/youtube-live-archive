import YoutubeLiveChatParser from './YoutubeLiveChatParser.js';
import LiveChatRenderer from './Renderer/LiveChatRenderer.js';
import TimeRangeCache from './TimeRangeCache.js';

export default class LiveChat {
    constructor(url, videoElement, chatContainer, channelId) {
        this._url = url;
        this._videoElement = videoElement;
        this._parser = new YoutubeLiveChatParser(channelId);
        this._renderer = new LiveChatRenderer(chatContainer, videoElement, this._getPreviousChatMessagesReverse.bind(this));
        this._messageCache = [];
        this._tickerCache = new TimeRangeCache(
            (item) => item.offset,
            (item) => item.offset + item.duration * 1000,
        );
        this._bannerCache = [];
        this._lineIterator = this._iterateLines();
    }

    async updateLiveChat() {
        const currentTimeMs = this._videoElement.currentTime * 1000;
        await this._fetchNewChatItems(currentTimeMs);
        this._renderer.renderMessages(this._getChatMessages(currentTimeMs));
        this._renderer.renderTickers(this._getChatTickers(currentTimeMs));
        this._renderer.renderBanners(this._getBanners(currentTimeMs));
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
            case 'CHAT_STICKER_PAID':
                this._messageCache.push(chatItem);
                break;
            case 'CHAT_TICKER_MESSAGE_PAID':
            case 'CHAT_TICKER_NEW_MEMBER':
                this._tickerCache.add(chatItem);
                break;
            case 'CHAT_BANNER':
                this._bannerCache.push(chatItem);
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

    *_getBanners(time) {
        let banner = null;
        for (const chatItem of this._bannerCache) {
            if (chatItem.offset > time) { break; }
            banner = chatItem;
        }
        if (banner) {
            yield banner;
        }
    }
}
