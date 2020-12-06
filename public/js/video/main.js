import app from './app-config.js';
import LiveChat from './live-chat/LiveChat.js';

// video
(() => {
    const video = document.querySelector('#video');
    const audio = document.querySelector('#audio');

    if (!audio) {
        return;
    }

    let notPlayedYet = true;
    video.addEventListener('playing', (event) => {
        if (notPlayedYet) {
            const previousTime = JSON.parse(window.localStorage.getItem(`video-pos-${app.videoId}`));
            if (previousTime) {
                video.currentTime = previousTime;
            }
            notPlayedYet = false;
        }
        audio.currentTime = video.currentTime;
        audio.play();
    });

    video.addEventListener('pause', (event) => {
        audio.pause();
    });

    window.addEventListener('beforeunload', (event) => {
        if (notPlayedYet) { return; }
        window.localStorage.setItem(`video-pos-${app.videoId}`, JSON.stringify(video.currentTime));
    });
})();

// live chat
(async () => {
    if (!app.hasLiveChat) {
        return;
    }

    const videoElement = document.querySelector('#video');
    const liveChatContainer = document.querySelector('#live-chat');
    const danmakuContainer = document.querySelector('#danmaku-container');

    const liveChat = new LiveChat(videoElement, liveChatContainer, danmakuContainer, app.videoId, app.channelId);
    videoElement.addEventListener('playing', () => liveChat.start());
    videoElement.addEventListener('seeked', () => liveChat.reload());
    videoElement.addEventListener('pause', () => liveChat.stop());
})();
