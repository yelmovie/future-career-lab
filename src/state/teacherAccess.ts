export const TEACHER_SESSION_KEY = 'future-career-lab.teacher-preview';

export function loadTeacherPreview(): boolean {
  try {
    return sessionStorage.getItem(TEACHER_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function persistTeacherPreview(enabled: boolean): void {
  try {
    if (enabled) sessionStorage.setItem(TEACHER_SESSION_KEY, 'true');
    else sessionStorage.removeItem(TEACHER_SESSION_KEY);
  } catch {
    // 저장이 막혀도 현재 탭의 React 상태에서는 계속 사용할 수 있다.
  }
}
