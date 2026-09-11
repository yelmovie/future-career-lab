import process from 'node:process';
import { verifyClassroomRelease } from './classroom-integrity.mjs';

try {
  const report = verifyClassroomRelease(process.argv[2] ?? 'dist');
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
