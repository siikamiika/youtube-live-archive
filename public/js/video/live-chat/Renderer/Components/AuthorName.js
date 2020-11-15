import Component from '/js/DomComponents/Component.js';
import {convertArgbIntRgbaCss} from '/js/helpers/css.js';

export default class AuthorName extends Component {
    constructor({authorName, authorNameColor, authorChannelId, badges, type}) {
        super();
        this._authorName = authorName;
        this._authorNameColor = authorNameColor;
        this._authorChannelId = authorChannelId;
        this._badges = badges;
        this._type = type;
    }

    _render() {
        let isSponsor = false;
        let sponsorDuration = null;
        let sponsorUrl = null;
        let isOwner = false;
        let isModerator = false;
        let isVerified = false;

        for (const badge of this._badges) {
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

        const linkContents = [this._authorName];

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
            href: `https://www.youtube.com/channel/${encodeURIComponent(this._authorChannelId)}`,
            rel: 'noopener noreferrer',
            target: '_blank',
            C: linkContents,
        };

        if (sponsorDuration !== null) {
            authorLink.title = sponsorDuration === 0
                ? 'New member'
                : `Member (${sponsorDuration} month${sponsorDuration === 1 ? '' : 's'})`;
        }

        // TODO move to ChatMessagePaid
        if (this._type === 'CHAT_MESSAGE_PAID') {
            authorLink.style = {color: convertArgbIntRgbaCss(this._authorNameColor)};
        }

        return authorLink;
    }
}
