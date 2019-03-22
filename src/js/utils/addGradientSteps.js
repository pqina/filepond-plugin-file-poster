const easeInOutSine = t => -0.5 * (Math.cos(Math.PI * t) - 1);

export const addGradientSteps = (
    gradient,
    color,
    alpha = 1,
    easeFn = easeInOutSine,
    steps = 10,
    offset = 0
) => {
    const range = 1 - offset;
    const rgb = color.join(',');
    for (let i = 0; i <= steps; i++) {
        const p = i / steps;
        const stop = offset + range * p;
        gradient.addColorStop(stop, `rgba(${rgb}, ${easeFn(p) * alpha})`);
    }
};
