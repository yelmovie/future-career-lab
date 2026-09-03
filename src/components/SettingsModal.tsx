import { useState } from 'react';
import { STORAGE_POLICY_TEXT } from '../shared/constants';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { audioService } from '../services/audioService';
import { Modal } from './Modal';
import { MutedIcon, SoundIcon } from './Icons';
import './settings.css';

const DEFAULT_BGM = 0.28;
const DEFAULT_SFX = 0.7;

const STANDARDS: { code: string; subject: string; text: string }[] = [
  {
    code: '[6실01-07]',
    subject: '실과 · 진로 탐색',
    text: '직업의 필요성을 이해하고 적성, 흥미, 성격에 따라 진로 발달 계획을 세우고 주도적으로 탐색한다.',
  },
  {
    code: '[6도01-03]',
    subject: '도덕 · 자기 이해와 진로 설계',
    text: '자기가 하고 싶은 일을 선택할 때 도덕적 고려의 필요성을 알고 자신의 특기와 적성을 탐색하여 진로계획을 수립한다.',
  },
  {
    code: '[6과16-02]',
    subject: '과학 · 과학과 관련된 진로',
    text: '다양한 진로가 과학과 관련됨을 알고, 자신의 진로를 과학과 관련지어 설명할 수 있다.',
  },
  {
    code: '[6과16-01]',
    subject: '과학 · 미래 사회와 문제 해결',
    text: '미래 사회에 일어날 수 있는 문제를 조사하고, 문제를 해결하는 데 과학이 기여할 수 있는 방법을 토의할 수 있다.',
  },
];

const STANDARD_MAP: { section: string; focus: string; codes: string }[] = [
  { section: 'Stage 1 · 일하는 방식 선택', focus: '흥미와 적성, 선호하는 일하는 방식', codes: '[6실01-07], [6도01-03]' },
  { section: 'Stage 2 · 직업 미스터리', focus: '근거와 추론으로 실제 업무 이해하기', codes: '[6실01-07]' },
  { section: 'Stage 2 · 드론 촬영 미션', focus: '기술을 활용한 직업 체험', codes: '[6과16-02]' },
  { section: 'Stage 3 · 앵무새 돌봄과 서식지', focus: '책임, 관찰, 동물 복지, 생명과학 연결', codes: '[6도01-03], [6과16-02]' },
  { section: 'Stage 4 · 중요한 일 먼저 하기', focus: '책임감, 우선순위, 결정의 결과', codes: '[6실01-07], [6도01-03]' },
  { section: 'Stage 5 · 도시 문제 함께 풀기', focus: '미래 사회 문제 해결과 직업 간 협업', codes: '[6과16-01], [6과16-02]' },
  { section: 'Page 9 · 나의 일하기 지도', focus: '자기 이해와 계속되는 진로 탐색', codes: '[6실01-07], [6도01-03]' },
];

const CREDIT_SFX: { title: string; creator: string }[] = [
  { title: 'UI Click Soft', creator: 'SoundShelfStudio' },
  { title: 'UI Swipe Navigation Soft', creator: 'SoundShelfStudio' },
  { title: 'UI Soft Glass Ping', creator: 'SoundShelfStudio' },
  { title: 'UI Drag Drop', creator: 'SoundShelfStudio' },
  { title: 'UI Warning Buzz', creator: 'SoundShelfStudio' },
  { title: 'UI Data Processing Beep', creator: 'SoundShelfStudio' },
  { title: 'UI Success Chime', creator: 'SoundShelfStudio' },
  { title: 'Success/Finish UI sound effect', creator: 'Nomagician' },
];

export function SettingsModal({ onClose, onNavigate }: { onClose: () => void; onNavigate: (page: PageNumber) => void }) {
  const { save, setAudio, startNew } = useGame();
  const [confirmReset, setConfirmReset] = useState(false);
  const { bgmVolume, sfxVolume, muted } = save.audio;

  // ponytail: 개별 on/off 는 볼륨 0 으로 표현한다. 저장 스키마에 필드를 더하지 않으려는 선택.
  const apply = (patch: Partial<typeof save.audio>) => {
    audioService.unlock();
    setAudio(patch);
  };

  return (
    <Modal
      title="설정"
      onClose={onClose}
      actions={<button className="button button--primary" onClick={onClose}>닫기</button>}
    >
      <div className="settings">
        <section className="settings-block">
          <h3>소리</h3>
          <div className="settings-row">
            <button
              className="settings-toggle"
              aria-pressed={!muted}
              onClick={() => apply({ muted: !muted })}
            >
              {muted ? <MutedIcon /> : <SoundIcon />}
              <span>{muted ? '전체 음소거 켬' : '전체 소리 켬'}</span>
            </button>
            <p className="settings-hint">수업 중에는 전체 음소거로 한 번에 끌 수 있어요.</p>
          </div>

          <div className="settings-slider">
            <button
              className="settings-toggle settings-toggle--small"
              aria-pressed={bgmVolume > 0}
              onClick={() => apply({ bgmVolume: bgmVolume > 0 ? 0 : DEFAULT_BGM })}
            >
              배경음 {bgmVolume > 0 ? '켬' : '끔'}
            </button>
            <label>
              <span>배경음 크기</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(bgmVolume * 100)}
                onChange={(event) => apply({ bgmVolume: Number(event.target.value) / 100 })}
              />
              <b>{Math.round(bgmVolume * 100)}</b>
            </label>
          </div>

          <div className="settings-slider">
            <button
              className="settings-toggle settings-toggle--small"
              aria-pressed={sfxVolume > 0}
              onClick={() => apply({ sfxVolume: sfxVolume > 0 ? 0 : DEFAULT_SFX })}
            >
              효과음 {sfxVolume > 0 ? '켬' : '끔'}
            </button>
            <label>
              <span>효과음 크기</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(sfxVolume * 100)}
                onChange={(event) => apply({ sfxVolume: Number(event.target.value) / 100 })}
              />
              <b>{Math.round(sfxVolume * 100)}</b>
            </label>
          </div>
        </section>

        <details className="settings-block">
          <summary>학생용 게임 방법</summary>
          <ol className="settings-play-steps">
            <li><b>1</b><span>그림에서 숫자나 빛나는 곳을 눌러.</span></li>
            <li><b>2</b><span>마음에 드는 방법 하나를 골라.</span></li>
            <li><b>3</b><span>초록색 완료가 뜨면 다음으로 가.</span></li>
          </ol>
          <p className="settings-hint">막히면 화면 위 물음표를 눌러 전체 길을 다시 볼 수 있어.</p>
        </details>

        <details className="settings-block">
          <summary>교사용 가이드</summary>
          <p><b>수업 35분 운영 예시</b></p>
          <ul className="settings-list">
            <li>도입 5분 — 전자칠판으로 홈 화면을 함께 보고, 이름을 적고 지금 할 일을 확인합니다.</li>
            <li>전개 25분 — Stage 1~5를 순서대로 진행합니다. 한 스테이지에 4~6분이 걸립니다.</li>
            <li>정리 5분 — 9쪽 &lt;나의 일하기 지도&gt;를 함께 읽고, 10쪽 수료증을 확인합니다.</li>
          </ul>
          <p><b>5개 스테이지가 하는 일</b></p>
          <ul className="settings-list">
            <li>Stage 1 — 상황 선택으로 자신이 선호하는 일하는 방식을 기록합니다.</li>
            <li>Stage 2 — 단서를 모아 직업을 추론하고, 드론으로 촬영 미션을 수행합니다.</li>
            <li>Stage 3 — 앵무새를 관찰·기록하고 서식지를 다시 설계합니다.</li>
            <li>Stage 4 — 제한된 시간과 힘 안에서 중요한 일의 순서를 정합니다.</li>
            <li>Stage 5 — 여러 직업이 협력해 도시 문제를 해결합니다.</li>
          </ul>
          <p><b>준비물</b></p>
          <ul className="settings-list">
            <li>태블릿은 가로 화면으로 고정하고, 브라우저는 전체 화면으로 둡니다.</li>
            <li>소리를 쓰는 활동이므로 헤드셋을 쓰거나, 설정에서 배경음을 끄고 진행합니다.</li>
            <li>전자칠판은 도입과 정리 단계에서만 쓰고, 전개 단계는 개별 태블릿으로 진행합니다.</li>
            <li>기록이 기기에 저장되므로 같은 학생이 같은 기기를 쓰면 이어서 할 수 있습니다.</li>
          </ul>
        </details>

        <details className="settings-block">
          <summary>성취기준</summary>
          <p className="settings-hint">2022 개정 교육과정 기준입니다.</p>
          {STANDARDS.map((item) => (
            <div key={item.code} className="settings-standard">
              <b>{item.code}</b>
              <small>{item.subject}</small>
              <p>{item.text}</p>
            </div>
          ))}
          <div className="settings-table-scroll">
            <table className="settings-table">
              <thead>
                <tr><th>게임 구간</th><th>주요 학습 초점</th><th>관련 성취기준</th></tr>
              </thead>
              <tbody>
                {STANDARD_MAP.map((row) => (
                  <tr key={row.section}><td>{row.section}</td><td>{row.focus}</td><td>{row.codes}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        <details className="settings-block">
          <summary>효과음 크레딧</summary>
          <p className="settings-hint">Pixabay Content License · 라이선스 요약: pixabay.com/service/license-summary/</p>
          <ul className="settings-list">
            {CREDIT_SFX.map((item) => (
              <li key={item.title}>{item.title} — {item.creator}</li>
            ))}
          </ul>
        </details>

        <section className="settings-block">
          <h3>앱 정보</h3>
          <ul className="settings-list">
            <li>미래 직업실 · v0.1.0</li>
            <li>기획·제작 옐쌤</li>
            <li>제공 issamGPT AI Mart</li>
          </ul>
        </section>

        <section className="settings-block">
          <h3>저장 정책</h3>
          <p>{STORAGE_POLICY_TEXT}</p>
        </section>

        <section className="settings-block">
          <h3>기록 관리</h3>
          {save.certificateUnlocked && <button className="settings-toggle" onClick={() => { onClose(); onNavigate(10); }}>수료증 보기·인쇄</button>}
          {!confirmReset ? (
            <button className="button button--danger button--block" onClick={() => setConfirmReset(true)}>내 기록 처음부터 다시 하기</button>
          ) : (
            <div className="settings-reset-confirm" role="alert">
              <strong>지금까지 한 기록을 모두 지울까?</strong>
              <div><button className="button" onClick={() => setConfirmReset(false)}>아니야</button><button className="button button--danger" onClick={() => { startNew(); onClose(); }}>기록 지우기</button></div>
            </div>
          )}
        </section>

        <section className="settings-block settings-block--legal">
          <h3>저작권</h3>
          <p>기획·제작: 옐쌤<br />제공: issamGPT AI Mart<br />ⓒ 2026 옐쌤</p>
          <p>이 앱의 화면 캡처, 자체 제작 일러스트와 음원은 무단 복제·재배포·상업적 이용을 금합니다.</p>
          <p>이 앱의 일러스트는 생성형 AI로 제작했습니다.</p>
          <p>효과음의 저작권은 각 저작권자에게 있으며 Pixabay Content License를 따릅니다.</p>
          <p>교육 내용 출처: 교육부 2022 개정 교육과정 (ncic.re.kr)</p>
          <p>이용 조건은 issamGPT AI Mart 이용약관을 따릅니다.</p>
        </section>
      </div>
    </Modal>
  );
}
