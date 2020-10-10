(() => {
    const video = document.querySelector('#video');
    const audio = document.querySelector('#audio');

    if (!audio) {
        return;
    }

    video.addEventListener('playing', (event) => {
        audio.currentTime = video.currentTime;
        audio.play();
    });

    video.addEventListener('pause', (event) => {
        audio.pause();
    });
})();
