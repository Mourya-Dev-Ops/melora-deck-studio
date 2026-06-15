/**
 * Extract dominant colors from an image URL for creating dynamic gradients
 */
export async function extractDominantColors(imageUrl: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    resolve(['#1a1a1a', '#2a2a2a']); // Fallback
                    return;
                }

                // Scale down for performance
                const size = 100;
                canvas.width = size;
                canvas.height = size;

                ctx.drawImage(img, 0, 0, size, size);
                const imageData = ctx.getImageData(0, 0, size, size);
                const pixels = imageData.data;

                // Sample colors
                const colorCounts: { [key: string]: number } = {};

                for (let i = 0; i < pixels.length; i += 4 * 10) { // Sample every 10th pixel
                    const r = pixels[i];
                    const g = pixels[i + 1];
                    const b = pixels[i + 2];
                    const a = pixels[i + 3];

                    // Skip transparent or very dark/light pixels
                    if (a < 125 || (r + g + b) < 50 || (r + g + b) > 680) continue;

                    const color = `rgb(${r},${g},${b})`;
                    colorCounts[color] = (colorCounts[color] || 0) + 1;
                }

                // Get top 3 colors
                const sortedColors = Object.entries(colorCounts)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([color]) => color);

                if (sortedColors.length === 0) {
                    resolve(['#1a1a1a', '#2a2a2a']); // Fallback
                } else {
                    // Convert to hex and add variations
                    const hexColors = sortedColors.map(rgbToHex);
                    resolve(hexColors);
                }

            } catch (error) {
                console.error('Color extraction failed:', error);
                resolve(['#1a1a1a', '#2a2a2a']); // Fallback
            }
        };

        img.onerror = () => {
            resolve(['#1a1a1a', '#2a2a2a']); // Fallback
        };

        img.src = imageUrl;
    });
}

function rgbToHex(rgb: string): string {
    const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return '#1a1a1a';

    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);

    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Darken a hex color by a percentage
 */
export function darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, ((num >> 16) & 0xFF) * (1 - percent / 100));
    const g = Math.max(0, ((num >> 8) & 0xFF) * (1 - percent / 100));
    const b = Math.max(0, (num & 0xFF) * (1 - percent / 100));

    return '#' + ((1 << 24) + (Math.floor(r) << 16) + (Math.floor(g) << 8) + Math.floor(b)).toString(16).slice(1);
}
