// Beta 0.8 Phase 3.1 (P3-F6): PDFs set in legacy Thai fonts store tone marks, vowels and the thanthakhat as Private Use Area glyphs
// (U+F700-F71A, the Windows/Mac "shifted" forms). No font draws them, so "รีสอร์ต" showed as "รีสอร□ต". They are the same letters as the
// standard Thai marks, so they map straight back. Applied to text pulled out of a document and to every string the app renders.
const THAI_PUA={
  '':'ฐ','':'ิ','':'ี','':'ึ','':'ื',
  '':'่','':'้','':'๊','':'๋','':'์',
  '':'่','':'้','':'๊','':'๋','':'์',
  '':'ญ','':'ั','':'ํ','':'็','':'่',
  '':'้','':'๊','':'๋','':'์','':'ุ',
  '':'ู','':'ฺ'
};
export const normalizeThaiPua=value=>String(value??'').replace(/[-]/g,char=>THAI_PUA[char]||char);
