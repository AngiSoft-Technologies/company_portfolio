import zxcvbn from 'zxcvbn';

export function checkPasswordStrength(password: string) {
    const result = zxcvbn(password || '');
    const minScore = 2; // configurable threshold
    return { ok: result.score >= minScore, score: result.score, feedback: result.feedback };
}
