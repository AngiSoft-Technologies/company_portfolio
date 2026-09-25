declare module 'zxcvbn' {
    interface ZXCVBNResultFeedback {
        warning: string;
        suggestions: string[];
    }

    interface ZXCVBNResult {
        score: 0 | 1 | 2 | 3 | 4;
        crack_times_display: Record<string, string>;
        feedback: ZXCVBNResultFeedback;
        [k: string]: any;
    }

    function zxcvbn(input: string, userInputs?: string[]): ZXCVBNResult;
    export default zxcvbn;
}
