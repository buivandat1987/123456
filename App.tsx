
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  EvaluationData, 
  EvaluationLevel, 
  EvaluationPeriod,
  GRADES, 
  QUALITY_LABELS, 
  COMPETENCY_LABELS 
} from './types';
import { generateEvaluationCommentSplit, SplitEvaluation } from './services/geminiService';

const App: React.FC = () => {
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SplitEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [studentList, setStudentList] = useState<any[]>([]);
  const [parsedEvaluations, setParsedEvaluations] = useState<EvaluationData[]>([]);
  const [bulkResults, setBulkResults] = useState<Record<number, SplitEvaluation>>({});
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set());
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [globalGrade, setGlobalGrade] = useState<string>(GRADES[0]);
  const [globalPeriod, setGlobalPeriod] = useState<EvaluationPeriod>(EvaluationPeriod.MID_TERM_1);

  const [formData, setFormData] = useState<EvaluationData>({
    student: { name: '', grade: globalGrade, gender: 'Nam' },
    period: globalPeriod,
    qualities: { patriotism: EvaluationLevel.HOAN_THANH, kindness: EvaluationLevel.HOAN_THANH, hardworking: EvaluationLevel.HOAN_THANH, honesty: EvaluationLevel.HOAN_THANH, responsibility: EvaluationLevel.HOAN_THANH },
    competencies: { autonomy: EvaluationLevel.HOAN_THANH, communication: EvaluationLevel.HOAN_THANH, problemSolving: EvaluationLevel.HOAN_THANH, language: EvaluationLevel.HOAN_THANH, math: EvaluationLevel.HOAN_THANH, science: EvaluationLevel.HOAN_THANH, arts: EvaluationLevel.HOAN_THANH, physical: EvaluationLevel.HOAN_THANH, technology: EvaluationLevel.HOAN_THANH, it: EvaluationLevel.HOAN_THANH },
    additionalObservations: '',
  });

  const mapExcelLevel = (val: any): EvaluationLevel => {
    if (!val) return EvaluationLevel.HOAN_THANH;
    const v = val.toString().toUpperCase().trim();
    if (v === 'T') return EvaluationLevel.TOT;
    if (v === 'C') return EvaluationLevel.CHUA_HOAN_THANH;
    return EvaluationLevel.HOAN_THANH;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      setStudentList(data);

      const rows = data.slice(2); // Bắt đầu đọc từ dòng thứ 3 (index 2)
      const evaluations: EvaluationData[] = rows
        .filter(row => row[2]) // Cột C: Họ tên
        .map(row => ({
          student: { name: row[2], grade: globalGrade, gender: 'Nam' },
          period: globalPeriod,
          competencies: {
            autonomy: mapExcelLevel(row[5]),      // F
            communication: mapExcelLevel(row[6]),  // G
            problemSolving: mapExcelLevel(row[7]), // H
            language: mapExcelLevel(row[9]),       // J
            math: mapExcelLevel(row[10]),          // K
            science: mapExcelLevel(row[11]),       // L
            arts: mapExcelLevel(row[12]),          // M
            physical: mapExcelLevel(row[13]),       // N
            technology: mapExcelLevel(row[14]),    // O
            it: mapExcelLevel(row[15])             // P
          },
          qualities: {
            patriotism: mapExcelLevel(row[17]),    // R
            kindness: mapExcelLevel(row[18]),      // S
            hardworking: mapExcelLevel(row[19]),   // T
            honesty: mapExcelLevel(row[20]),       // U
            responsibility: mapExcelLevel(row[21])  // V
          },
          additionalObservations: ''
        }));

      setParsedEvaluations(evaluations);
      setBulkResults({});
      setFailedIndices(new Set());
      if (evaluations.length > 0) selectStudent(evaluations[0], 0);
    };
    reader.readAsBinaryString(file);
  };

  const selectStudent = (evalData: EvaluationData, index: number) => {
    setSelectedIndex(index);
    setFormData({ ...evalData, student: { ...evalData.student, grade: globalGrade }, period: globalPeriod });
    setResult(bulkResults[index] || null);
    setError(null);
  };

  const handleGenerateAll = async () => {
    if (parsedEvaluations.length === 0) return;
    setIsGeneratingAll(true);
    setProgress(0);
    const newResults = { ...bulkResults };
    const newFailed = new Set(failedIndices);

    for (let i = 0; i < parsedEvaluations.length; i++) {
      if (newResults[i]) { setProgress(i + 1); continue; }
      try {
        const res = await generateEvaluationCommentSplit({ ...parsedEvaluations[i], student: { ...parsedEvaluations[i].student, grade: globalGrade }, period: globalPeriod });
        newResults[i] = res;
        newFailed.delete(i);
        setBulkResults({ ...newResults });
      } catch (err) { newFailed.add(i); }
      setProgress(i + 1);
      setFailedIndices(new Set(newFailed));
      await new Promise(r => setTimeout(r, 200));
    }
    setIsGeneratingAll(false);
  };

  const exportToExcel = () => {
    if (studentList.length === 0) return;
    const outputData = studentList.map(row => [...row]);

    parsedEvaluations.forEach((_, idx) => {
      const rowIndex = idx + 2;
      if (bulkResults[idx]) {
        if (!outputData[rowIndex]) outputData[rowIndex] = [];
        // Điền vào các cột "Nhận xét" trên Mẫu 2
        outputData[rowIndex][4] = bulkResults[idx].generalCompetencyComment;  // Cột E
        outputData[rowIndex][8] = bulkResults[idx].specificCompetencyComment; // Cột I
        outputData[rowIndex][16] = bulkResults[idx].qualityComment;           // Cột Q
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(outputData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nhận xét");
    XLSX.writeFile(wb, `KetQua_Mau2_${globalGrade}.xlsx`);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <header className="mb-8 text-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-3xl font-bold text-blue-900 uppercase tracking-tight">Trợ Lý Thông Tư 27 - Mẫu 2</h1>
        <p className="text-slate-500 mt-2 font-medium italic">Tự động nhận xét Năng lực & Phẩm chất (Cột E, I, Q)</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-1/4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase mb-3">Thông tin lớp & Kỳ</h2>
            <div className="space-y-3">
              <select value={globalGrade} onChange={(e) => setGlobalGrade(e.target.value)} className="w-full p-2 text-sm border rounded-lg bg-slate-50">
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <select value={globalPeriod} onChange={(e) => setGlobalPeriod(e.target.value as EvaluationPeriod)} className="w-full p-2 text-sm border rounded-lg bg-slate-50">
                {Object.values(EvaluationPeriod).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <button onClick={() => fileInputRef.current?.click()} className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-emerald-700 transition-all">
                Nhập Excel Mẫu 2
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 h-[400px] flex flex-col">
            <h2 className="text-xs font-bold text-slate-400 uppercase mb-3">Danh sách học sinh</h2>
            <div className="flex-grow overflow-y-auto space-y-1">
              {parsedEvaluations.map((stu, idx) => (
                <button key={idx} onClick={() => selectStudent(stu, idx)} className={`w-full text-left p-2 rounded-lg text-sm transition-all flex items-center justify-between ${selectedIndex === idx ? 'bg-blue-600 text-white' : 'hover:bg-slate-50 text-slate-600'} ${failedIndices.has(idx) ? 'bg-red-50 text-red-600' : ''}`}>
                  <span className="truncate">{idx + 1}. {stu.student.name}</span>
                  {bulkResults[idx] && <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>}
                </button>
              ))}
            </div>
          </div>
          
          {parsedEvaluations.length > 0 && (
            <div className="flex flex-col gap-2">
              <button onClick={handleGenerateAll} disabled={isGeneratingAll} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 disabled:bg-slate-300">
                {isGeneratingAll ? `Đang xử lý ${progress}/${parsedEvaluations.length}` : "Tự động nhận xét tất cả"}
              </button>
              <button onClick={exportToExcel} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold">
                Xuất file kết quả
              </button>
            </div>
          )}
        </aside>

        <main className="lg:w-3/4 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                Dữ liệu đầu vào
              </h2>
              <div className="space-y-2 text-[11px]">
                <div className="bg-slate-50 p-2 rounded-lg mb-2">
                    <p className="font-bold text-blue-900">{formData.student.name}</p>
                    <p className="text-slate-500">{globalGrade} - {globalPeriod}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <p className="font-bold text-blue-600 uppercase text-[9px]">Năng lực chung</p>
                        <p>Tự chủ: <b>{formData.competencies.autonomy}</b></p>
                        <p>Giao tiếp: <b>{formData.competencies.communication}</b></p>
                        <p>GQVD: <b>{formData.competencies.problemSolving}</b></p>
                    </div>
                    <div className="space-y-1">
                        <p className="font-bold text-emerald-600 uppercase text-[9px]">Phẩm chất</p>
                        <p>Yêu nước: <b>{formData.qualities.patriotism}</b></p>
                        <p>Chăm chỉ: <b>{formData.qualities.hardworking}</b></p>
                        <p>Trách nhiệm: <b>{formData.qualities.responsibility}</b></p>
                    </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <div className="w-1 h-6 bg-emerald-500 rounded-full"></div>
                Nhận xét gợi ý (Cột E, I, Q)
              </h2>
              <div className="flex-grow space-y-3 overflow-y-auto max-h-[400px]">
                {result ? (
                  <>
                    <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                      <label className="text-[9px] font-bold text-blue-600 uppercase block mb-1">Cột E: Năng lực chung</label>
                      <p className="text-xs text-slate-700 italic leading-relaxed">"{result.generalCompetencyComment}"</p>
                    </div>
                    <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                      <label className="text-[9px] font-bold text-indigo-600 uppercase block mb-1">Cột I: Năng lực đặc thù</label>
                      <p className="text-xs text-slate-700 italic leading-relaxed">"{result.specificCompetencyComment}"</p>
                    </div>
                    <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                      <label className="text-[9px] font-bold text-emerald-600 uppercase block mb-1">Cột Q: Phẩm chất</label>
                      <p className="text-xs text-slate-700 italic leading-relaxed">"{result.qualityComment}"</p>
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-300 italic text-center px-8 text-sm">
                    {isGeneratingAll ? "AI đang viết nhận xét..." : "Dữ liệu kết quả sẽ hiển thị tại đây"}
                  </div>
                )}
              </div>
            </section>
          </div>
          
          <div className="bg-slate-900 text-white p-6 rounded-2xl flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-900/50">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div>
                <h3 className="font-bold text-lg">Xử lý Mẫu 2 chính xác</h3>
                <p className="text-slate-400 text-sm">Hệ thống đọc mức T/Đ/C và ghi vào 3 cột nhận xét tương ứng.</p>
              </div>
            </div>
            <div className="hidden md:block text-right">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data Mapping</div>
              <div className="text-white/60 text-xs">Indices: E(4), I(8), Q(16)</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
