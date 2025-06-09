export function round(percentages: number[], precision: number): number[] {
    const n = Math.pow(10, precision);
    percentages = percentages.map((p) => Math.round(p * n) / n);

    let total = percentages.reduce((a, b) => a + b, 0);
    let diff = Math.round((1 - total) * n) / n;
    if (!diff) return percentages;

    const adjustOrder = percentages
        .map((p, i) => ({ i, frac: p - Math.floor(p) }))
        .sort((a, b) => (a.frac - b.frac) * Math.sign(diff))
        .map((entry) => entry.i);

    for (const i of adjustOrder) {
        if (Math.abs(diff) < 0.000000001) break;

        const step = Math.sign(diff) / n;
        const newValue = percentages[i] + step;

        if (newValue >= 0 && newValue <= 1) {
            percentages[i] = newValue;
            diff = Math.round((diff - step) * n) / n;
        }
    }

    return percentages;
}
