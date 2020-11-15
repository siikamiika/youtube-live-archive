function convertArgbIntRgbaCss(color) {
    const b = color & 0xff;
    const g = (color >> 8) & 0xff;
    const r = (color >> 16) & 0xff;
    const a = ((color >> 24) & 0xff) / 0xff;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export {convertArgbIntRgbaCss};
