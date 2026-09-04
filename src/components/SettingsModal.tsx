import { useState } from 'react';
import { STORAGE_POLICY_TEXT } from '../shared/constants';
import { TEACHER_ANSWERS } from '../data/teacherGuide';
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
  { section: '브리핑 · 사건 접수', focus: '네 직업의 도구와 하는 일 알기, 나에게 맞을 직업 예측', codes: '[6실01-07], [6도01-03]' },
  { section: 'Stage 1 · 드론 현장가', focus: '제약(바람·배터리) 속 계획·실행, 사진을 근거로 잇기', codes: '[6과16-02], [6실01-07]' },
  { section: 'Stage 2 · 동물돌봄 전문가', focus: '관찰·기록, 개체마다 다른 돌봄, 생명 존중', codes: '[6도01-03], [6과16-02]' },
  { section: 'Stage 3 · 생태연구가', focus: '변인을 하나씩 바꿔 원인 찾기(과학 탐구)', codes: '[6과16-02], [6과16-01]' },
  { section: 'Stage 4 · 방송기술자', focus: '정보의 출처와 정확성 판단, 우선순위', codes: '[6실01-07], [6도01-03]' },
  { section: 'Stage 5 · 네 직업 연합', focus: '미래 사회 문제 해결과 직업 간 협업', codes: '[6과16-01], [6과16-02]' },
  { section: '돌아보기 · 수료증', focus: '예측과 실제 비교, 능력 진술로 자기 이해', codes: '[6실01-07], [6도01-03]' },
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
  { title: 'Tropical bird squeak (Mixkit)', creator: 'Mixkit' },
  { title: 'Hawk call squawk (Mixkit)', creator: 'Mixkit' },
  { title: 'Cutting trees with chainsaw ambiance (Mixkit)', creator: 'Mixkit' },
  { title: 'Tactical drone ambience (Mixkit)', creator: 'Mixkit' },
];

export function SettingsModal({ onClose, onNavigate }: { onClose: () => void; onNavigate: (page: PageNumber) => void }) {
  const { save, setAudio, startNew, teacherMode, unlockTeacherMode, lockTeacherMode } = useGame();
  const [confirmReset, setConfirmReset] = useState(false);
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherError, setTeacherError] = useState('');
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
            <li><b>1</b><span>미션 카드에서 "지금 할 일"과 "끝내면 얻는 것"을 먼저 읽어.</span></li>
            <li><b>2</b><span>화면을 잘 보고 직접 해 봐. 틀려도 벌칙은 없고 힌트가 나와.</span></li>
            <li><b>3</b><span>앞에서 얻은 사진·기록·그래프가 다음 미션에서 쓰여. 초록 완료가 뜨면 다음으로 가.</span></li>
          </ol>
          <p className="settings-hint">막히면 화면 위 물음표를 눌러 전체 길을 다시 볼 수 있어.</p>
        </details>

        <details className="settings-block">
          <summary>교사용 가이드</summary>
          {!teacherMode ? (
            <form className="teacher-unlock" onSubmit={(event) => {
              event.preventDefault();
              if (unlockTeacherMode(teacherPassword)) {
                setTeacherPassword('');
                setTeacherError('');
              } else {
                setTeacherError('비밀번호가 맞지 않습니다. 다시 확인해 주세요.');
              }
            }}>
              <p className="settings-hint">교사용 비밀번호를 입력하면 정답지와 전체 화면 바로가기가 열립니다.</p>
              <label htmlFor="teacher-password">교사용 비밀번호</label>
              <div>
                <input
                  id="teacher-password"
                  type="password"
                  value={teacherPassword}
                  autoComplete="off"
                  onChange={(event) => { setTeacherPassword(event.target.value); setTeacherError(''); }}
                />
                <button className="button button--teal" type="submit" disabled={!teacherPassword.trim()}>전체 해금</button>
              </div>
              {teacherError && <p className="teacher-unlock__error" role="alert">{teacherError}</p>}
            </form>
          ) : (
            <div className="teacher-guide">
              <div className="teacher-unlocked" role="status">
                <div><strong>교사용 전체 해금됨</strong><span>모든 페이지가 한꺼번에 열렸습니다. 학생의 진행 기록은 변경되지 않습니다.</span></div>
                <button className="button button--ghost" type="button" onClick={lockTeacherMode}>해금 종료</button>
              </div>

              <section aria-labelledby="teacher-answer-title">
                <h4 id="teacher-answer-title">정답지·판정 기준</h4>
                <div className="teacher-answers">
                  {TEACHER_ANSWERS.map((section) => (
                    <article key={section.title}>
                      <h5>{section.title}</h5>
                      <ul>{section.answers.map((answer) => <li key={answer}>{answer}</li>)}</ul>
                    </article>
                  ))}
                </div>
              </section>

              <section>
                <h4>운영 준비</h4>
                <ul className="settings-list">
                  <li>태블릿은 가로 화면으로 고정하고, 브라우저는 전체 화면으로 둡니다.</li>
                  <li>소리를 쓰는 활동이므로 헤드셋을 쓰거나, 설정에서 배경음을 끄고 진행합니다.</li>
                  <li>스테이지 산출물(사진·기록·그래프·클립)이 다음 스테이지의 재료가 되므로 학생 활동은 순서대로 진행합니다.</li>
                  <li>기록은 기기에 저장되므로 같은 학생이 같은 기기를 쓰면 이어서 할 수 있습니다.</li>
                </ul>
              </section>
            </div>
          )}
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
          <p className="settings-hint">Pixabay Content License · Mixkit Sound Effects Free License (표기 불필요, 상업 이용 가능)</p>
          <ul className="settings-list">
            {CREDIT_SFX.map((item) => (
              <li key={item.title}>{item.title} — {item.creator}</li>
            ))}
          </ul>
        </details>

        <section className="settings-block">
          <h3>앱 정보</h3>
          <ul className="settings-list">
            <li>미래 직업실 · v2.0.0</li>
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
          {save.certificateUnlocked && <button className="settings-toggle" onClick={() => { onClose(); onNavigate(11); }}>수료증 보기·인쇄</button>}
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
          <p>효과음의 저작권은 각 저작권자에게 있으며 Pixabay Content License 및 Mixkit Sound Effects Free License를 따릅니다.</p>
          <p>교육 내용 출처: 교육부 2022 개정 교육과정 (ncic.re.kr)</p>
          <p>이용 조건은 issamGPT AI Mart 이용약관을 따릅니다.</p>
        </section>
      </div>
    </Modal>
  );
}
