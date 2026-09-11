import { useState } from 'react';
import { STORAGE_POLICY_TEXT } from '../shared/constants';
import { TEACHER_STANDARDS } from '../data/teacherGuide';
import { version as APP_VERSION } from '../../package.json';
import type { PageNumber } from '../shared/types';
import { useGame } from '../state/GameContext';
import { audioService } from '../services/audioService';
import { Modal } from './Modal';
import { MutedIcon, SoundIcon } from './Icons';
import './settings.css';

const DEFAULT_BGM = 0.28;
const DEFAULT_SFX = 0.7;

/** 팝업 하나에 다 넣으면 1,000px 넘게 스크롤된다. 탭으로 나눠 한 화면에 한 묶음만 보여 준다. */
type Tab = 'sound' | 'howto' | 'teacher' | 'info';
const TABS: readonly { id: Tab; label: string }[] = [
  { id: 'sound', label: '소리' },
  { id: 'howto', label: '학생용 가이드' },
  { id: 'teacher', label: '교사용 가이드' },
  { id: 'info', label: '기록 초기화·정보' },
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
  { title: 'Double little bird chirp (Mixkit)', creator: 'Mixkit' },
  { title: 'Jungle bird screech (Mixkit)', creator: 'Mixkit' },
  { title: 'Tropical forest bird chirp (Mixkit)', creator: 'Mixkit' },
  { title: 'Cutting trees with chainsaw ambiance (Mixkit)', creator: 'Mixkit' },
  { title: 'Tactical drone ambience (Mixkit)', creator: 'Mixkit' },
  { title: 'Little birds singing in the trees (Mixkit)', creator: 'Mixkit' },
  { title: 'construction equipment tracked.wav (Freesound, CC0)', creator: 'cognito perceptu' },
];

export function SettingsModal({ onClose, onNavigate }: { onClose: () => void; onNavigate: (page: PageNumber) => void }) {
  const { save, setAudio, startNew, teacherMode, unlockTeacherMode, lockTeacherMode } = useGame();
  const [tab, setTab] = useState<Tab>('sound');
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
      className="settings-modal"
      subheader={
        <div className="settings-tabs" role="tablist" aria-label="설정 항목">
          {TABS.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className="settings-tab" onClick={() => { audioService.playSfx('tap'); setTab(item.id); }}>
              {item.label}
            </button>
          ))}
        </div>
      }
      actions={<button className="button button--primary" onClick={onClose}>닫기</button>}
    >
      <div className="settings" role="tabpanel">
        {tab === 'sound' && (
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
        )}

        {tab === 'howto' && (
          <section className="settings-block">
            <h3>학생용 가이드</h3>
            <div className="settings-guide">
              <p><b>무슨 게임이야?</b> 숲의 새들이 자꾸 사라지고 있어. 드론 현장가, 동물돌봄 전문가, 생태연구가, 방송기술자가 되어 차례로 원인을 찾는 게임이야.</p>
            </div>
            <ol className="settings-play-steps">
              <li><b>1</b><span>화면 위 한 줄만 읽고, 그 한 가지를 해 봐.</span></li>
              <li><b>2</b><span>틀려도 괜찮아. 아래에 있는 멘토가 힌트를 말해 줘.</span></li>
              <li><b>3</b><span>다 하면 오른쪽 아래 노란 버튼이 켜져. 누르면 다음 화면이야.</span></li>
              <li><b>?</b><span>막히면 화면 오른쪽 위 물음표를 눌러. 지금 뭘 하면 되는지 알려 줘.</span></li>
            </ol>
            <p className="settings-hint">다 끝내면 배지 5개와 수료증을 받아. 기록은 이 기기에 저장되니까 다음에 이어서 해도 돼.</p>
          </section>
        )}

        {tab === 'teacher' && (
          <section className="settings-block">
            <h3>교사용 가이드</h3>
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
                <p className="settings-hint">교사용 비밀번호를 입력하면 성취기준과 전체 화면 바로가기가 열립니다.</p>
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
                  <div><strong>교사용 전체 해금됨</strong><span>상단바의 "교사용 · 다음 화면" 버튼으로 미션을 건너뛰며 볼 수 있습니다. 학생의 진행 기록은 변경되지 않습니다.</span></div>
                  <button className="button button--ghost" type="button" onClick={lockTeacherMode}>해금 종료</button>
                </div>

                <details className="settings-block settings-block--nested" open>
                  <summary>성취기준</summary>
                  {TEACHER_STANDARDS.map((item) => (
                    <div key={item.code} className="settings-standard">
                      <b>{item.code}</b>
                      <small>{item.subject}</small>
                      <p>{item.text}</p>
                    </div>
                  ))}
                </details>
              </div>
            )}
          </section>
        )}

        {tab === 'info' && (
          <>
            <section className="settings-block">
              <h3>기록 초기화</h3>
              <p className="settings-hint">수료증까지 다 받았어도 여기서 지우면 처음부터 다시 할 수 있어.</p>
              {save.certificateUnlocked && <button className="settings-toggle" onClick={() => { onClose(); onNavigate(11); }}>수료증 보기·저장·인쇄</button>}
              {!confirmReset ? (
                <button className="button button--danger button--block" onClick={() => setConfirmReset(true)}>기록 초기화 · 처음부터 다시 하기</button>
              ) : (
                <div className="settings-reset-confirm" role="alert">
                  <strong>지금까지 한 기록을 모두 지울까?</strong>
                  <div><button className="button" onClick={() => setConfirmReset(false)}>아니야</button><button className="button button--danger" onClick={() => { startNew(); onClose(); }}>기록 지우기</button></div>
                </div>
              )}
              <p className="settings-hint">{STORAGE_POLICY_TEXT}</p>
            </section>

            <details className="settings-block">
              <summary>앱 정보</summary>
              <ul className="settings-list">
                <li>미래 직업실 · v{APP_VERSION}</li>
                <li>기획·제작 옐쌤</li>
                <li>제공 issamGPT AI Mart</li>
              </ul>
            </details>

            <details className="settings-block">
              <summary>효과음 크레딧</summary>
              <p className="settings-hint">Pixabay Content License · Mixkit Sound Effects Free License · CC0 1.0 (상업 이용 가능)</p>
              <ul className="settings-list">
                {CREDIT_SFX.map((item) => (
                  <li key={item.title}>{item.title} — {item.creator}</li>
                ))}
              </ul>
            </details>

            <details className="settings-block settings-block--legal">
              <summary>저작권</summary>
              <p>기획·제작: 옐쌤<br />제공: issamGPT AI Mart<br />ⓒ 2026 옐쌤</p>
              <p>이 앱의 화면 캡처, 자체 제작 일러스트와 음원은 무단 복제·재배포·상업적 이용을 금합니다.</p>
              <p>이 앱의 일러스트와 일부 안내 음성은 생성형 AI로 제작했습니다.</p>
              <p>효과음의 저작권은 각 저작권자에게 있으며 Pixabay Content License, Mixkit Sound Effects Free License, CC0 1.0을 따릅니다.</p>
              <p>교육 내용 출처: 교육부 2022 개정 교육과정 (ncic.re.kr)</p>
              <p>이용 조건은 issamGPT AI Mart 이용약관을 따릅니다.</p>
            </details>
          </>
        )}
      </div>
    </Modal>
  );
}
