/** Shapes of the messages passed between the app and its sandboxes. */

import type { ApiRoute, ChallengeTest } from "@/lib/content/schema";
import type { ErrorInfo } from "@/lib/engine/errorTranslator";

export interface LogLine {
  level: "log" | "info" | "warn" | "error";
  text: string;
}

export interface TestResult {
  name: string;
  passed: boolean;
  /** Why it failed, in plain words, e.g. "Expected 5 but got 4". */
  message?: string;
}

export interface FakeRequest {
  method: string;
  path: string;
  status: number;
}

export interface RunResult {
  logs: LogLine[];
  results: TestResult[];
  /** Requests the code made to the pretend API. */
  requests: FakeRequest[];
  /** Set if the code crashed (or was stopped for taking too long). */
  error?: ErrorInfo;
}

export interface JsJob {
  code: string;
  tests: Pick<ChallengeTest, "name" | "code">[];
  api?: ApiRoute[];
}
