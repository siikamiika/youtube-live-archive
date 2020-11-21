export default class DanmakuLayer {
    constructor(container, getCurrentTime, duration, laneCount) {
        this._container = container;
        this._getCurrentTime = getCurrentTime;
        this._duration = duration;
        this._lanes = Array.from({length: laneCount}, () => []);
        this._bullets = {};
    }

    hasBullet(id) {
        return !!this._bullets[id];
    }

    garbageCollect(checkExpired=true) {
        for (const lane of this._lanes) {
            while (lane.length) {
                const bullet = lane[0];
                if (checkExpired && !this._isBulletExpired(bullet)) { break; }
                delete this._bullets[bullet.id];
                bullet.element.remove();
                lane.shift();
            }
        }
    }

    addBullet(bullet) {
        if (this._bullets[bullet.id]) {
            throw new Error('Attempted to add duplicate bullet to danmaku layer');
        }

        // element has no bounding box before it's in DOM
        this._container.appendChild(bullet.element);

        let maxOffsetIdx = null;
        let maxOffset = null;
        for (let i = 0; i < this._lanes.length; i++) {
            const lane = this._lanes[i];
            let minOffset = null;
            for (const bullet2 of lane) {
                const offset = this._bulletOverlapOffset(bullet, bullet2);
                if (minOffset === null || minOffset > offset) {
                    minOffset = offset;
                }
            }
            if (minOffset === null || minOffset > 0) {
                this._addBullet(bullet, i);
                return;
            }
            if (maxOffsetIdx === null || (minOffset !== null && minOffset > maxOffset)) {
                maxOffsetIdx = i;
                maxOffset = minOffset ?? 0;
            }
        }
        this._addBullet(bullet, maxOffsetIdx);
    }

    _addBullet(bullet, laneIdx) {
        this._animateBullet(bullet, laneIdx);
        this._bullets[bullet.id] = bullet;
        this._lanes[laneIdx].push(bullet);
    }

    pause() {
        for (const lane of this._lanes) {
            for (const bullet of lane) {
                bullet.pauseAnimation();
            }
        }
    }

    play() {
        for (let i = 0; i < this._lanes.length; i++) {
            const lane = this._lanes[i];
            for (const bullet of lane) {
                this._animateBullet(bullet, i);
            }
        }
    }

    _animateBullet(bullet, laneIdx) {
        const yPos = this._laneYPos(laneIdx);
        const containerWidth = this._container.clientWidth;
        const delay = bullet.offset - this._getCurrentTime();
        const duration = this._duration;
        bullet.animate(yPos, containerWidth, delay, duration);
    }

    _laneYPos(idx) {
        return (idx / this._lanes.length) * this._container.clientHeight;
    }

    _isBulletExpired(bullet) {
        return this._getCurrentTime() - bullet.offset > this._duration;
    }

    _bulletOverlapOffset(bullet1, bullet2) {
        const currentTime = this._getCurrentTime();
        const containerWidth = this._container.clientWidth;

        const bulletVelocity = (bullet) => (containerWidth + bullet.width) / this._duration;
        const bulletHeadPos = (bullet, time) => bulletVelocity(bullet) * (currentTime - bullet.offset);
        const bulletTailPos = (bullet, time) => bulletHeadPos(bullet, time) - bullet.width;

        const bullet2TailStart1 = bulletTailPos(bullet2, bullet1.offset);
        const bullet1HeadEnd2 = bulletHeadPos(bullet1, bullet2.offset + this._duration);

        const startOffset = -bullet2TailStart1 / bulletVelocity(bullet2);
        const endOffset = (bullet1HeadEnd2 - containerWidth) / bulletVelocity(bullet1) + this._duration;

        const velocity1 = bulletVelocity(bullet1);
        const velocity2 = bulletVelocity(bullet2);

        return -Math.min(startOffset, endOffset);
    }
}
