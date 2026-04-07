import { ROUND1_MCQ_BANK, ROUND2_CODING_BANK } from './src/lib/questionBank';
import * as fs from 'fs';

const mappedCoding = ROUND2_CODING_BANK.map((q) => {
  const starterTemplates = Object.entries(q.starterCode || {}).map(([lang, code]) => ({ language: lang, code }));
  const wrappers = q.wrappers ? Object.entries(q.wrappers).map(([lang, code]) => ({ language: lang, code })) : undefined;
  return { ...q, starterTemplates, wrappers };
});

fs.writeFileSync('final_mcqs.json', JSON.stringify(ROUND1_MCQ_BANK, null, 2));
fs.writeFileSync('final_coding.json', JSON.stringify(mappedCoding, null, 2));
