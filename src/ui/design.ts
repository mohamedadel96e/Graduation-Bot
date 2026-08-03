/**
 * GradBot Design System
 *
 * A unified palette and helper functions used across all embeds and logs.
 * No emojis — clean, professional text labels only.
 */

export const PALETTE = {
    forest: 0x778873,  // archived, neutral states
    sage:   0xa1bc98,  // active, success, primary actions
    sand:   0xdccfc0,  // secondary, info, grading
    cream:  0xfdf6ed,  // accent (light — used sparingly)
    error:  0xc45b4b,  // errors — a muted red harmonizing with the earthy palette
} as const;

export function statusColor(status: string): number {
    switch (status) {
        case 'Active':    return PALETTE.sage;
        case 'Finalized': return PALETTE.sand;
        case 'Archived':  return PALETTE.forest;
        default:          return PALETTE.forest;
    }
}

export function statusLabel(status: string): string {
    switch (status) {
        case 'Active':    return 'Active';
        case 'Finalized': return 'Finalized';
        case 'Archived':  return 'Archived';
        default:          return status;
    }
}

export function difficultyLabel(difficulty: string): string {
    switch (difficulty) {
        case 'Easy':   return 'Easy';
        case 'Medium': return 'Medium';
        case 'Hard':   return 'Hard';
        default:       return difficulty || 'Unset';
    }
}

/**
 * Renders a text-based progress bar for a grade value (1-5).
 * Example: gradeBar(3.2) → "██████░░░░ 3.2"
 */
export function gradeBar(value: number): string {
    const filled = Math.round(value * 2);     // 0-10
    const empty  = 10 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `${bar} ${value.toFixed(1)}`;
}

/**
 * Renders a text-based progress bar for a percentage (0-100).
 * Example: progressBar(60) → "██████░░░░ 60%"
 */
export function progressBar(percentage: number): string {
    const clamped = Math.max(0, Math.min(100, percentage));
    const filled = Math.round(clamped / 10); // 0-10
    const empty = 10 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `${bar} ${clamped}%`;
}

export const BOT_FOOTER = 'GradBot';
