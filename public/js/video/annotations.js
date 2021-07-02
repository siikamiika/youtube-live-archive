(async () => {
    const video = document.querySelector('#video');
    const videoContainer = document.querySelector(".video-container");

    const parser = new AnnotationParser();
    const xmlData = await (await fetch(`/storage/annotations/${app.videoId}.xml`)).text();
    const annotationElements = parser.getAnnotationsFromXml(xmlData);
    const annotations = parser.parseYoutubeAnnotationList(annotationElements);

    const renderer = new AnnotationRenderer(annotations, videoContainer, {
        getVideoTime() {
            return video.currentTime;
        },
        seekTo(seconds) {
            video.currentTime = seconds;
        },
        getOriginalVideoWidth() {
            return video.videoWidth;
        },
        getOriginalVideoHeight() {
            return video.videoHeight;
        }
    });
    renderer.start();

    window.addEventListener("resize", e => {
        renderer.updateAllAnnotationSizes();
    });
})();
