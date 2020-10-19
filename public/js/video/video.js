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
        window.localStorage.setItem(`video-pos-${app.videoId}`, JSON.stringify(video.currentTime));
    });
})();
