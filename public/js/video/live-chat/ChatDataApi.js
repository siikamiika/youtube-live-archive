import YoutubeLiveChatParser from './YoutubeLiveChatParser.js';
import TimeRangeCache from './TimeRangeCache.js';

export default class ChatDataApi {
    constructor(videoId, channelId) {
        this._videoId = videoId;
        this._parser = new YoutubeLiveChatParser(channelId);
        this._messageCache = [];
        this._lastSequence = null;
        this._tickerCache = new TimeRangeCache(
            (item) => item.offset,
            (item) => item.offset + item.duration * 1000,
        );
        this._bannerCache = [];
    }

    *getChatMessagesAmount(time, nPrevious) {
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

    *getChatMessagesTimeRange(time, historySeconds) {
        const chatItems = [];
        let index = this._findChatIndex(time);
        while (index >= 0) {
            const chatItem = this._messageCache[index];
            if (chatItem.offset + (historySeconds * 1000) <= time) { break; }
            chatItems.push(chatItem);
            index--;
        }
        for (let i = chatItems.length - 1; i >= 0; i--) {
            yield chatItems[i];
        }
    }

    *getPreviousChatMessagesReverse(time, nPrevious, currentId) {
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

    *getChatTickers(time) {
        yield* this._tickerCache.get(time);
    }

    *getBanners(time) {
        let banner = null;
        for (const chatItem of this._bannerCache) {
            if (chatItem.offset > time) { break; }
            banner = chatItem;
        }
        if (banner) {
            yield banner;
        }
    }

    _getUrl() {
        return new URL(`${window.location.protocol}//${window.location.host}/api/live_chat_replay/${this._videoId}`);
    }

    async fetchInitialChatItems() {
        const url = this._getUrl();
        const result = await (await fetch(url)).json();
        for (const {sequence, data} of result.data) {
            for (const chatItem of this._parser.parse(data)) {
                this._cacheChatItem(chatItem);
            }
            this._lastSequence = sequence;
        }
    }

    async fetchNewChatItems(time) {
        if (this._messageCache.length === 0 || this._messageCache[this._messageCache.length - 1].offset < time + 5000) {
            const url = this._getUrl();
            url.search = new URLSearchParams({lastSequence: this._lastSequence}).toString();
            const result = await (await fetch(url)).json();
            for (const {sequence, data} of result.data) {
                for (const chatItem of this._parser.parse(data)) {
                    this._cacheChatItem(chatItem);
                }
                this._lastSequence = sequence;
            }
        }
    }

    async fetchChatItemsAt(currentTime) {
        this._lastSequence = null;
        this._messageCache = [];
        this._tickerCache.clear();
        const url = this._getUrl();
        url.search = new URLSearchParams({currentTime}).toString();
        const result = await (await fetch(url)).json();
        for (const {sequence, data} of result.data) {
            for (const chatItem of this._parser.parse(data)) {
                this._cacheChatItem(chatItem);
            }
            this._lastSequence = sequence;
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
                // TODO handle seek (also range in backend)
                this._bannerCache.push(chatItem);
                break;
        }
    }

    _findChatIndex(time) {
        if (this._messageCache.length === 0) { return -1; }
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
}
