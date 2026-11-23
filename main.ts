import fs from "node:fs";
import path from "node:path";
const IN = process.env.MAKEFUN_INPUT_DIR ?? "/input";
const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const IMIN = -2147483648;
function run(P, I) {
  const S = [];
  const K = [];
  const M = new Int32Array(256);
  const B = [];
  let p = 0; // pc
  let q = 0;
  let n = 0;
  let L = 0;
  const need = (k) => { if (S.length < k) throw 2; }; // underflow
  const push = (v) => { if (S.length > 255) throw 3; S.push(v); }; // overflow
  try {
    for (;;) {
      if (n >= 1000000) throw 10;
      if (p < 0 || p >= P.length) throw 9;
      const o = P[p];
      if (!(o <= 7 || (o >= 16 && o <= 30) || (o >= 32 && o <= 34) || (o >= 48 && o <= 52) || (o >= 64 && o <= 65) || (o >= 80 && o <= 83))) throw 5;
      const m = o === 1 ? 1 : o === 2 ? 4 : o >= 48 && o <= 51 ? 2 : 0;
      if (p + 1 + m > P.length) throw 9;
      n++;
      switch (o) {
        case 0: return [Buffer.from(B), 0]; // HALT
        case 1: push((P[p + 1] << 24) >> 24); p += 2; break;
        case 2: push(P[p + 1] | (P[p + 2] << 8) | (P[p + 3] << 16) | (P[p + 4] << 24)); p += 5; break; // PUSH32 LE
        case 3: need(1); S.pop(); p++; break; // POP
        case 4: need(1); push(S[S.length - 1]); p++; break; // DUP
        case 5: { need(2); const t = S[S.length - 1]; S[S.length - 1] = S[S.length - 2]; S[S.length - 2] = t; p++; break; } // SWAP
        case 6: need(2); push(S[S.length - 2]); p++; break; // OVER
        case 7: { need(3); const t = S[S.length - 3]; S[S.length - 3] = S[S.length - 2]; S[S.length - 2] = S[S.length - 1]; S[S.length - 1] = t; p++; break; } // ROT
        case 16: { need(2); const b = S.pop(), a = S.pop(); push((a + b) | 0); p++; break; } // ADD wrap
        case 17: { need(2); const b = S.pop(), a = S.pop(); push((a - b) | 0); p++; break; } // SUB wrap
        case 18: { need(2); const b = S.pop(), a = S.pop(); push(Math.imul(a, b)); p++; break; } // MUL low 32
        case 19: { need(2); const b = S.pop(), a = S.pop(); if (b === 0) throw 4; push(a === IMIN && b === -1 ? IMIN : (Math.trunc(a / b) | 0)); p++; break; }
        case 20: { need(2); const b = S.pop(), a = S.pop(); if (b === 0) throw 4; push(b === -1 ? 0 : a % b); p++; break; }
        case 21: { need(2); const b = S.pop(), a = S.pop(); if (b === 0) throw 4; push(Math.floor((a >>> 0) / (b >>> 0)) | 0); p++; break; }
        case 22: { need(2); const b = S.pop(), a = S.pop(); if (b === 0) throw 4; push(((a >>> 0) % (b >>> 0)) | 0); p++; break; } // MODU unsigned
        case 23: need(1); S[S.length - 1] = (-S[S.length - 1]) | 0; p++; break; // NEG wrap
        case 24: { need(2); const b = S.pop(), a = S.pop(); push(a & b); p++; break; } // AND
        case 25: { need(2); const b = S.pop(), a = S.pop(); push(a | b); p++; break; } // OR
        case 26: { need(2); const b = S.pop(), a = S.pop(); push(a ^ b); p++; break; } // XOR
        case 27: need(1); S[S.length - 1] = ~S[S.length - 1]; p++; break; // NOT
        case 28: { need(2); const b = S.pop(), a = S.pop(); push(a << (b & 31)); p++; break; } // SHL
        case 29: { need(2); const b = S.pop(), a = S.pop(); push(a >> (b & 31)); p++; break; } // SHR aritmetik
        case 30: { need(2); const b = S.pop(), a = S.pop(); push((a >>> (b & 31)) | 0); p++; break; } // SHRU logis
        case 32: { need(2); const b = S.pop(), a = S.pop(); push(a === b ? 1 : 0); p++; break; } // EQ
        case 33: { need(2); const b = S.pop(), a = S.pop(); push(a < b ? 1 : 0); p++; break; } // LT signed
        case 34: { need(2); const b = S.pop(), a = S.pop(); push((a >>> 0) < (b >>> 0) ? 1 : 0); p++; break; } // LTU
        case 48: p = p + 3 + (((P[p + 1] | (P[p + 2] << 8)) << 16) >> 16); break;
        case 49: { need(1); const v = S.pop(); const off = ((P[p + 1] | (P[p + 2] << 8)) << 16) >> 16; p = v === 0 ? p + 3 + off : p + 3; break; } // JZ selalu pop
        case 50: { need(1); const v = S.pop(); const off = ((P[p + 1] | (P[p + 2] << 8)) << 16) >> 16; p = v !== 0 ? p + 3 + off : p + 3; break; }
        case 51: { if (K.length > 63) throw 7; K.push(p + 3); p = P[p + 1] | (P[p + 2] << 8); break; }
        case 52: if (!K.length) throw 8; p = K.pop(); break; // RET
        case 64: { need(1); const a = S.pop(); if (a < 0 || a > 255) throw 6; push(M[a]); p++; break; } // LOAD
        case 65: { need(2); const a = S.pop(), v = S.pop(); if (a < 0 || a > 255) throw 6; M[a] = v; p++; break; }
        case 80: { need(1); const v = S.pop(); const s = String(v); if (L + s.length > 65536) throw 11; for (let i = 0; i < s.length; i++) B.push(s.charCodeAt(i)); L += s.length; p++; break; } // PRINT desimal
        case 81: { need(1); const v = S.pop(); if (L + 1 > 65536) throw 11; B.push(v & 255); L++; p++; break; } // PUTC
        case 82: push(q < I.length ? I[q++] : -1); p++; break;
        case 83: { need(1); const v = S.pop(); return [Buffer.from(B), v & 255]; } // EXIT low byte
        default: throw 5;
      }
    }
  } catch (e) {
    if (typeof e === "number") return [Buffer.from(B), e];
    throw e;
  }
}
for (const ent of fs.readdirSync(IN, {withFileTypes: true}).sort((a, b) => a.name < b.name ? -1 : 1)) {
  if (!ent.isDirectory()) continue;
  const id = ent.name;
  const dir = path.join(IN, id);
  let out = Buffer.alloc(0), code = 9;
  try {
    [out, code] = run(fs.readFileSync(path.join(dir, "program.bin")), fs.readFileSync(path.join(dir, "input.bin")));
  } catch { /* fallback di atas */ }
  fs.mkdirSync(path.join(OUT, id), {recursive: true});
  fs.writeFileSync(path.join(OUT, id, "stdout.bin"), out);
  fs.writeFileSync(path.join(OUT, id, "exit.txt"), code + "\n");
}
