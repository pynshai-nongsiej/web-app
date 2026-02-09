export interface Question {
    id: number;
    subject: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    correct_answer: string;
    last_reviewed_at?: string;
    review_count?: number;
    recall_score?: number;
}

export interface UserStats {
    totalAttempted: number;
    correctCount: number;
    mastery: number; // 0-100
    subjectProgress: Record<string, number>;
}
