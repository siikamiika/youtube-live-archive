export default class YoutubeLiveChatParser {
    constructor (channelId) {
        this._channelId = channelId;
    }

    // TODO move to backend
    *parse(data) {
        const offset = Number(data?.replayChatItemAction?.videoOffsetTimeMsec);
        for (const action of data?.replayChatItemAction?.actions || []) {
            if (!action) { continue; }

            if (action.addChatItemAction?.item) {
                yield* this._parseAddChatItemAction(action.addChatItemAction?.item, offset);
            } else if (action.addLiveChatTickerItemAction?.item) {
                yield* this._parseAddLiveChatTickerItemAction(action.addLiveChatTickerItemAction.item, offset);
            } else if (action.addBannerToLiveChatCommand?.bannerRenderer) {
                yield* this._parseAddBannerToLiveChatCommand(action.addBannerToLiveChatCommand.bannerRenderer, offset);
            } else if (action.replaceLiveChatRendererAction) {
                // out of scope for now
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
                authorPhotoUrl: this._parseAuthorPhotoUrl(renderer),
                messageParts: renderer.message ? renderer.message.runs.map(this._transformMessageRun.bind(this)) : [],
                badges: this._parseBadges(renderer),
                offset: offset > 0 ? offset : this._parseTimestampText(renderer),
            };
        } else if (item.liveChatPaidMessageRenderer) {
            const renderer = item.liveChatPaidMessageRenderer;
            yield {
                type: 'CHAT_MESSAGE_PAID',
                id: renderer.id,
                authorChannelId: renderer.authorExternalChannelId,
                authorName: renderer.authorName.simpleText,
                authorPhotoUrl: this._parseAuthorPhotoUrl(renderer),
                messageParts: renderer.message ? renderer.message.runs.map(this._transformMessageRun.bind(this)) : [],
                paidAmount: renderer.purchaseAmountText.simpleText,
                headerBgColor: renderer.headerBackgroundColor,
                headerFgColor: renderer.headerTextColor,
                bodyBgColor: renderer.bodyBackgroundColor,
                bodyFgColor: renderer.bodyTextColor,
                authorNameColor: renderer.authorNameTextColor,
                badges: this._parseBadges(renderer),
                offset: offset > 0 ? offset : this._parseTimestampText(renderer),
            };
        } else if (item.liveChatMembershipItemRenderer) {
            const renderer = item.liveChatMembershipItemRenderer;
            yield {
                type: 'CHAT_NEW_MEMBER',
                id: renderer.id,
                authorChannelId: renderer.authorExternalChannelId,
                authorName: renderer.authorName.simpleText,
                authorPhotoUrl: this._parseAuthorPhotoUrl(renderer),
                messageParts: renderer.headerSubtext ? renderer.headerSubtext.runs.map(this._transformMessageRun.bind(this)) : [],
                badges: this._parseBadges(renderer),
                offset: offset > 0 ? offset : this._parseTimestampText(renderer),
            };
        } else if (item.liveChatPaidStickerRenderer) {
            const renderer = item.liveChatPaidStickerRenderer;
            yield {
                type: 'CHAT_STICKER_PAID',
                id: renderer.id,
                authorChannelId: renderer.authorExternalChannelId,
                authorName: renderer.authorName.simpleText,
                authorPhotoUrl: this._parseAuthorPhotoUrl(renderer),
                stickerUrl: this._parseStickerUrl(renderer),
                stickerDescription: renderer.sticker.accessibility.accessibilityData.label,
                stickerWidth: renderer.stickerDisplayWidth,
                stickerHeight: renderer.stickerDisplayHeight,
                paidAmount: renderer.purchaseAmountText.simpleText,
                bgColor: renderer.backgroundColor,
                authorNameColor: renderer.authorNameTextColor,
                // moneyBgColor: renderer.moneyChipBackgroundColor, // TODO not used?
                moneyFgColor: renderer.moneyChipTextColor,
                badges: this._parseBadges(renderer),
                offset: offset > 0 ? offset : this._parseTimestampText(renderer),
            };
        } else if (item.liveChatModeChangeMessageRenderer) {
            const renderer = item.liveChatModeChangeMessageRenderer;
            // TODO
            const example = {
                "replayChatItemAction": {
                    "actions": [
                        {
                            "addChatItemAction": {
                                "item": {
                                    "liveChatModeChangeMessageRenderer": {
                                        "id": "ChwKGkNLalluTHlMa09rQ0ZkV0d3Z0Vkb09nUHJn",
                                        "timestampUsec": "1588247625411624",
                                        "icon": {"iconType": "SLOW_MODE"},
                                        "text": {"runs": [{"text": "Slow mode is on", "bold": true}]},
                                        "subtext": {"runs": [{"text": "Send a message every ", "italics": true}, {"text": "60 seconds", "italics": true}]},
                                        "timestampText": {"simpleText": "-5:37"}
                                    }
                                }
                            }
                        },
                        {"replaceLiveChatRendererAction": {
                            "toReplace": "REPLACE_LIVE_CHAT_ACTION_PANEL",
                            "replacement": {
                                "liveChatRestrictedParticipationRenderer": {
                                    "message": {"runs": [{"text": "Slow mode was enabled"}]},
                                    "buttons": [{"buttonRenderer": {"icon": {"iconType": "INFO"}, "trackingParams": "CBcQ8FsYCSITCKHkuc-gg-0CFZx7sgodkrEOCg==", "accessibilityData": {"accessibilityData": {"label": "The creator enabled slow mode during this time."}}, "command": {"clickTrackingParams": "CBcQ8FsYCSITCKHkuc-gg-0CFZx7sgodkrEOCg==", "commandMetadata": {"webCommandMetadata": {"url": "/service_ajax", "sendPost": true}}, "signalServiceEndpoint": {"signal": "CLIENT_SIGNAL", "actions": [{"liveChatAddToToastAction": {"item": {"notificationTextRenderer": {"successResponseText": {"simpleText": "The creator enabled slow mode during this time."}, "trackingParams": "CBgQyscDIhMIoeS5z6CD7QIVnHuyCh2SsQ4K"}}}}]}}}}],
                                    "icon": {"iconType": "LOCK"}
                                }
                            }
                        }}
                    ],
                    "videoOffsetTimeMsec": "0"
                }
            };
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
            const expandedMessage = this._parseAddChatItemAction(renderer.showItemEndpoint.showLiveChatItemEndpoint.renderer, offset).next()?.value;
            yield {
                type: 'CHAT_TICKER_MESSAGE_PAID',
                id: renderer.id,
                authorPhotoUrl: this._parseAuthorPhotoUrl(renderer),
                paidAmount: renderer.amount.simpleText,
                amountColor: renderer.amountTextColor,
                startBgColor: renderer.startBackgroundColor,
                endBgColor: renderer.endBackgroundColor,
                duration: renderer.fullDurationSec,
                expandedMessage,
                offset: expandedMessage.offset,
            };
        } else if (item.liveChatTickerSponsorItemRenderer) {
            const renderer = item.liveChatTickerSponsorItemRenderer;
            const expandedMessage = this._parseAddChatItemAction(renderer.showItemEndpoint.showLiveChatItemEndpoint.renderer, offset).next()?.value;
            yield {
                type: 'CHAT_TICKER_NEW_MEMBER',
                id: renderer.id,
                authorPhotoUrl: this._parseAuthorPhotoUrl(renderer),
                textParts: renderer.detailText ? renderer.detailText.runs.map(this._transformMessageRun.bind(this)) : [],
                textColor: renderer.detailTextColor,
                startBgColor: renderer.startBackgroundColor,
                endBgColor: renderer.endBackgroundColor,
                duration: renderer.fullDurationSec,
                expandedMessage,
                offset: expandedMessage.offset,
            };
        } else if (item.liveChatTickerPaidStickerItemRenderer) {
            const renderer = item.liveChatTickerPaidStickerItemRenderer;
            // TODO
        } else {
            throw new Error('Unknown chat ticker renderer: ' + JSON.stringify(item));
        }
    }

    *_parseAddBannerToLiveChatCommand(item, offset) {
        if (item.liveChatBannerRenderer) {
            const renderer = item.liveChatBannerRenderer;
            const expandedMessage = this._parseAddChatItemAction(renderer.contents, offset).next()?.value;
            if (!expandedMessage) { return; }
            yield {
                type: 'CHAT_BANNER',
                id: expandedMessage.id,
                headerTextParts: renderer.header.liveChatBannerHeaderRenderer.text.runs.map(this._transformMessageRun.bind(this)),
                expandedMessage,
                offset: expandedMessage.offset,
            };
        }
    }

    _transformMessageRun(run) {
        if (run.text) {
            return {text: run.text};
        }

        if (run.emoji) {
            return {
                emoji: {
                    url: '/storage/images/live_chat_emoji/' + this._channelId + '/' + run.emoji.emojiId.split('/')[1] + '.png',
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
                const newMemberPatterns = [
                    /New member/,
                    /新規メンバー/,
                ];
                for (const re of newMemberPatterns) {
                    if (re.test(badgeRenderer.tooltip)) {
                        duration = 0;
                        break;
                    }
                }
                if (duration === null) {
                    const memberBadgePatterns = [
                        /Member \((?:(\d+) years?\, (\d+) months?)|(?:(\d+) years?)|(?:(\d+) months?)\)/,
                        /メンバー（(?:(\d+) 年 (\d+) か月)|(?:(\d+) 年)|(?:(\d+) か月)）/, // TODO over １ 年, how is it actually formatted?
                    ];
                    let m = null;
                    for (const re of memberBadgePatterns) {
                        m = re.exec(badgeRenderer.tooltip);
                        if (m) { break; }
                    }
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
                        url = '/storage/images/live_chat_sponsor_badges/' + this._channelId + '/' + d + '.png';
                        break;
                    }
                }

                badges.push({type: 'sponsor', duration, url});
            }
        }

        return badges;
    }

    _parseStickerUrl(renderer) {
        const chosenUrl = this._chooseThumbnailUrl(renderer.sticker.thumbnails);
        if (!chosenUrl) { return null; }
        const m = /^(?:https?:)?\/\/(.*)$/.exec(chosenUrl);
        if (!m[1]) { return null; }
        return `/storage/images/stickers/${this._encodeBase64Url(m[1])}/sticker.webp`;
    }

    _parseAuthorPhotoUrl(renderer) {
        const thumbnails = (renderer.authorPhoto ?? renderer.sponsorPhoto)?.thumbnails;
        if (!thumbnails) { return null; }
        const chosenUrl = this._chooseThumbnailUrl(thumbnails);
        if (!chosenUrl) { return null; }
        const filename = this._encodeBase64Url(chosenUrl);
        const channelId = renderer.authorExternalChannelId;
        return `/storage/images/author_photos/${channelId}/${filename}.jpeg`;
    }

    _encodeBase64Url(bytes) {
        return btoa(bytes)
            .replaceAll('/', '_')
            .replaceAll('+', '-')
            .replaceAll('=', '');
    }

    _chooseThumbnailUrl(thumbnails) {
        let maxWidth = null;
        let chosenUrl = null;
        for (const {url, width} of thumbnails) {
            if (!maxWidth || width > maxWidth) {
                maxWidth = width;
                chosenUrl = url;
            }
        }
        return chosenUrl;
    }

    _parseTimestampText(renderer) {
        const timestampText = renderer?.timestampText?.simpleText;
        if (!timestampText) { return 0; }
        const negative = /^-/.test(timestampText);
        const parts = [...timestampText.matchAll(/[0-9]+/g)]
            .map((m) => Number(m[0]))
            .reverse();
        const multipliers = [1000, 60, 60];
        if (parts.length > multipliers.length) { throw new Error('Too many timestamp parts'); }
        let multiplier = 1;
        let result = 0;
        for (let i = 0; i < parts.length; i++) {
            multiplier *= multipliers[i];
            result += multiplier * parts[i];
        }
        return (negative ? -1 : 1) * result;
    }
}
