
import { GoogleGenAI, Type } from "@google/genai";
import { EvaluationData, QUALITY_LABELS, COMPETENCY_LABELS } from "../types";

export interface SplitEvaluation {
  generalCompetencyComment: string;
  specificCompetencyComment: string;
  qualityComment: string;
}

export const generateEvaluationCommentSplit = async (data: EvaluationData): Promise<SplitEvaluation> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Viết nhận xét học bạ Thông tư 27 cho học sinh ${data.student.name} (${data.student.grade}) kỳ ${data.period}.
    
    1. Năng lực chung (Mức T/Đ/C):
    - Tự chủ: ${data.competencies.autonomy}, Giao tiếp: ${data.competencies.communication}, GQVD: ${data.competencies.problemSolving}
    
    2. Năng lực đặc thù (Mức T/Đ/C):
    - Ngôn ngữ: ${data.competencies.language}, Toán: ${data.competencies.math}, Khoa học: ${data.competencies.science}, Thẩm mĩ: ${data.competencies.arts}, Thể chất: ${data.competencies.physical}, Công nghệ: ${data.competencies.technology}, Tin học: ${data.competencies.it}

    3. Phẩm chất (Mức T/Đ/C):
    - Yêu nước: ${data.qualities.patriotism}, Nhân ái: ${data.qualities.kindness}, Chăm chỉ: ${data.qualities.hardworking}, Trung thực: ${data.qualities.honesty}, Trách nhiệm: ${data.qualities.responsibility}

    Yêu cầu nhận xét:
    - generalCompetencyComment: Nhận xét về sự tiến bộ trong các năng lực chung (Tự chủ, Giao tiếp, GQVD).
    - specificCompetencyComment: Nhận xét cụ thể về các môn học, nhấn mạnh các môn đạt mức T (Tốt).
    - qualityComment: Nhận xét về đạo đức, lối sống và các phẩm chất chủ yếu.
    
    Trả về JSON. Ngôn ngữ trang trọng, đúng văn phong sư phạm Việt Nam.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: "Bạn là chuyên gia giáo dục tiểu học. Hãy viết nhận xét ngắn gọn (30-45 từ mỗi đoạn), súc tích, khích lệ học sinh. Trả về đúng cấu trúc JSON yêu cầu.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            generalCompetencyComment: { type: Type.STRING },
            specificCompetencyComment: { type: Type.STRING },
            qualityComment: { type: Type.STRING }
          },
          required: ["generalCompetencyComment", "specificCompetencyComment", "qualityComment"]
        }
      },
    });
    
    return JSON.parse(response.text || "{}") as SplitEvaluation;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
