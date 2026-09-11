import { describe, expect, it } from 'vitest';
import { createDefaultSave } from '../state/defaultSave';
import { getLearningRecord, learningRecordText, transferCase, transferVerdict } from './learningRecord';

describe('실제 활동 기록', () => {
  it('새 협업 활동과 완료 기록을 보여 주고 폐기한 공원 시험을 요구하지 않는다', () => {
    const save = createDefaultSave();
    const summary = '물길 위치를 전하고, 묘목을 심고, 공사팀에 조용한 방법을 부탁했어.';
    save.logs = [{ id: 'cooperation-1', page: 9, type: 'alliance-clear', summary, tags: ['직업 협업'], traits: {}, contextRef: 'cooperation-forest', createdAt: save.updatedAt }];
    expect(getLearningRecord(save).find((entry) => entry.id === 'cooperation')).toEqual({ id: 'cooperation', title: '함께 숲을 도운 일', detail: summary, recorded: true });
    expect(learningRecordText(save)).not.toContain('새로운 공원');
  });
  it('도움 하나를 마쳤으면 그 기록만 보여 주고 세 곳을 모두 마쳤다고 하지 않는다', () => {
    const save = createDefaultSave();
    save.logs = [{ id: 'help-1', page: 9, type: 'cooperation-help', summary: '막힌 물길의 위치를 정비팀에 전했어.', tags: [], traits: {}, contextRef: 'cooperation:water', createdAt: save.updatedAt }];
    expect(getLearningRecord(save).find((entry) => entry.id === 'cooperation')).toMatchObject({ detail: save.logs[0]!.summary, recorded: true });
  });
  it('완료 플래그만으로 학습한 사실을 만들지 않는다', () => {
    const save = createDefaultSave();
    save.certificateUnlocked = true;
    expect(getLearningRecord(save).every((entry) => !entry.recorded)).toBe(true);
    expect(learningRecordText(save)).toContain('아직 저장된 사진이 없어');
  });
  it('선택한 초기 가설, 실제 결론, 수정 횟수를 보존한다', () => {
    const save = createDefaultSave();
    save.artifacts.hypothesis = 'water';
    save.artifacts.graphs = [{ variable: 'logging', verdict: 'main' }];
    save.pageData.page07Ecology = { conclusionHistory: ['water', 'logging'], trials: [{ variable: 'water', before: 1, after: 2 }, { variable: 'noise', before: 1, after: 7 }, { variable: 'logging', before: 1, after: 10 }] };
    const result = getLearningRecord(save).find((entry) => entry.id === 'ecology')!;
    expect(result.detail).toContain('처음 생각: 깨끗한 물');
    expect(result.detail).toContain('가장 큰 변화: 열매 나무');
    expect(result.detail).toContain('1번 다시');
  });
  it('옛 오답 완료 기록과 미정정 송출을 확인된 학습으로 포장하지 않는다', () => {
    const save = createDefaultSave();
    save.artifacts.graphs = [{ variable: 'water', verdict: 'main' }];
    save.artifacts.clip = { trust: 80, corrections: 1 };
    expect(getLearningRecord(save).find((entry) => entry.id === 'ecology')!.detail).toContain('다시 확인할 기록');
    expect(getLearningRecord(save).find((entry) => entry.id === 'broadcast')!.detail).toContain('바로잡은 기록 0회');
  });
});
describe('새 상황으로 전이', () => {
  it.each([42, 43])('새 공원의 결과에 맞는 방법과 이유를 고르면 기록 확인 없이 완료한다 (%i)', (seed) => {
    const scenario = transferCase(seed);
    expect(scenario.best).not.toBe('logging');
    expect(transferVerdict(scenario, 'logging', 'compare')).toBe(false);
    expect(transferVerdict(scenario, scenario.best, 'repeat')).toBe(false);
    expect(transferVerdict(scenario, scenario.best, 'guess')).toBe(false);
    expect(transferVerdict(scenario, scenario.best, null)).toBe(false);
    expect(transferVerdict(scenario, null, 'compare')).toBe(false);
    expect(transferVerdict(scenario, scenario.best, 'compare')).toBe(true);
    expect(scenario.counts[scenario.best]).toBe(Math.max(...Object.values(scenario.counts)));
    expect(transferCase(seed)).toEqual(scenario);
  });
});
