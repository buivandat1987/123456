
export enum EvaluationLevel {
  TOT = 'Tốt',
  HOAN_THANH = 'Hoàn thành',
  CHUA_HOAN_THANH = 'Chưa hoàn thành'
}

export enum EvaluationPeriod {
  MID_TERM_1 = 'Giữa học kì 1',
  END_TERM_1 = 'Cuối học kì 1',
  MID_TERM_2 = 'Giữa học kì 2',
  END_TERM_2 = 'Cuối học kì 2'
}

export interface StudentInfo {
  name: string;
  grade: string;
  gender: 'Nam' | 'Nữ';
}

export interface QualitativeEvaluation {
  patriotism: EvaluationLevel;
  kindness: EvaluationLevel;
  hardworking: EvaluationLevel;
  honesty: EvaluationLevel;
  responsibility: EvaluationLevel;
}

export interface CompetencyEvaluation {
  // Năng lực chung
  autonomy: EvaluationLevel;
  communication: EvaluationLevel;
  problemSolving: EvaluationLevel;
  // Năng lực đặc thù (Môn học)
  language: EvaluationLevel;
  math: EvaluationLevel;
  science: EvaluationLevel;
  arts: EvaluationLevel;
  physical: EvaluationLevel;
  technology: EvaluationLevel;
  it: EvaluationLevel;
}

export interface EvaluationData {
  student: StudentInfo;
  period: EvaluationPeriod;
  qualities: QualitativeEvaluation;
  competencies: CompetencyEvaluation;
  additionalObservations: string;
}

export const GRADES = ['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5'];

export const QUALITY_LABELS = {
  patriotism: 'Yêu nước',
  kindness: 'Nhân ái',
  hardworking: 'Chăm chỉ',
  honesty: 'Trung thực',
  responsibility: 'Trách nhiệm'
};

export const COMPETENCY_LABELS = {
  autonomy: 'Tự chủ và tự học',
  communication: 'Giao tiếp và hợp tác',
  problemSolving: 'Giải quyết vấn đề và sáng tạo',
  language: 'Ngôn ngữ',
  math: 'Tính toán',
  science: 'Khoa học',
  arts: 'Thẩm mĩ',
  physical: 'Thể chất',
  technology: 'Công nghệ',
  it: 'Tin học'
};
