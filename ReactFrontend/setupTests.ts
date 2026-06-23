import "@testing-library/jest-dom";

import { TextEncoder, TextDecoder } from "util";

(globalThis as { TextEncoder: typeof TextEncoder }).TextEncoder = TextEncoder;
(globalThis as { TextDecoder: typeof TextDecoder }).TextDecoder = TextDecoder;
