(() => {
    for (const videoCardElement of document.querySelectorAll('.video-card')) {
        const videoId = videoCardElement.dataset.videoId;
        const duration = Number(videoCardElement.dataset.duration);

        const progress = JSON.parse(window.localStorage.getItem(`video-pos-${videoId}`));
        if (!progress) {
            continue;
        }

        const progressElement = videoCardElement.querySelector('.video-card-progress');
        const progressBarElement = videoCardElement.querySelector('.video-card-progress-bar');

        progressElement.style.visibility = 'visible';
        progressBarElement.style.width = `${(progress / duration) * 100}%`;
    }
})();
