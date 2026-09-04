import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { failed: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('미래 직업실 화면 오류', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="error-recovery" role="alert">
        <div>
          <span>잠깐!</span>
          <h1>화면을 불러오지 못했어</h1>
          <p>기록은 이 기기에 남아 있어. 화면을 다시 불러오거나 메인으로 돌아가면 이어서 할 수 있어.</p>
          <div>
            <button className="button button--primary" onClick={() => window.location.reload()}>화면 다시 불러오기</button>
            <button className="button" onClick={() => { window.location.hash = '#/page/1'; window.location.reload(); }}>메인으로 돌아가기</button>
          </div>
        </div>
      </main>
    );
  }
}
