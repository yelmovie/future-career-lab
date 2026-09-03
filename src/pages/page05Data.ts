import { pageAsset, v2Asset } from '../shared/assets';

export type BirdId = 'green' | 'red';
export type CareZoneId = 'eyes' | 'feathers' | 'posture' | 'water' | 'behavior';
export type TreatmentId = 'water' | 'shelter' | 'puzzle' | 'feather';
export type SoundVerdict = 'normal' | 'abnormal';

export interface CareStatement {
  id: string;
  text: string;
  /** 화면에 실제로 보이는 근거인가. 짐작이면 false. */
  grounded: boolean;
}

export interface CareZone {
  id: CareZoneId;
  number: number;
  title: string;
  /** 확대했을 때 보이는 것 */
  visible: string;
  hotspot: { x: number; y: number };
  statements: CareStatement[];
}

export interface Bird {
  id: BirdId;
  name: string;
  issue: string;
  issueLabel: string;
  sickImage: string;
  recoveredImage: string;
  cue: 'parrotCall' | 'parrotAlarm';
  /** 소리 파일이 없어도 답할 수 있게 하는 글 설명 */
  soundHint: string;
  soundAnswer: SoundVerdict;
  soundFeedback: Record<SoundVerdict, string>;
  correctTreatment: TreatmentId;
  /** 보조 처치: 틀리진 않지만 먼저 할 일이 있어 효과가 절반 */
  assistTreatment?: TreatmentId;
  assistFeedback?: string;
  /** 틀린 처치를 놓았을 때 질문형 피드백 */
  wrongTreatmentFeedback: Record<TreatmentId, string>;
  zones: CareZone[];
}

export interface Treatment {
  id: TreatmentId;
  name: string;
  detail: string;
}

export const ZONE_TITLES: Record<CareZoneId, string> = {
  eyes: '눈',
  feathers: '깃털',
  posture: '날개·자세',
  water: '물·먹이',
  behavior: '행동·주변',
};

export const TREATMENTS: Treatment[] = [
  { id: 'water', name: '물·전해질', detail: '부리 옆에 물을 대주고 전해질을 섞어' },
  { id: 'shelter', name: '은신처·조용한 곳', detail: '가려진 상자를 넣고 조용한 방으로 옮겨' },
  { id: 'puzzle', name: '먹이 퍼즐', detail: '먹이를 찾아 먹게 하는 놀이 장치' },
  { id: 'feather', name: '깃털 관리', detail: '깃털을 다듬고 분무로 적셔 줘' },
];

const HOTSPOTS: Record<CareZoneId, { x: number; y: number }> = {
  eyes: { x: 52, y: 26 },
  feathers: { x: 47, y: 52 },
  posture: { x: 66, y: 46 },
  water: { x: 24, y: 76 },
  behavior: { x: 80, y: 74 },
};

/** statements 안에서 근거 있는 진술의 자리. 구역마다 다르게 두고, 화면에서는 세션 시드로 한 번 더 섞는다. */
function zone(id: CareZoneId, number: number, visible: string, groundedIndex: 0 | 1 | 2, statements: [string, string, string]): CareZone {
  return {
    id,
    number,
    title: ZONE_TITLES[id],
    visible,
    hotspot: HOTSPOTS[id],
    statements: statements.map((text, index) => ({ id: `${id}-${index}`, text, grounded: index === groundedIndex })),
  };
}

export const BIRDS: Bird[] = [
  {
    id: 'green',
    name: '초록 앵무',
    issue: '스트레스',
    issueLabel: '스트레스로 보여',
    sickImage: v2Asset('parrot-sick-green'),
    recoveredImage: pageAsset(5, 3),
    cue: 'parrotAlarm',
    soundHint: '짧고 날카로운 소리를 쉬지 않고 반복해. 파형이 뾰족하고 촘촘해.',
    soundAnswer: 'abnormal',
    soundFeedback: {
      abnormal: '맞아. 날카롭게 반복하는 울음은 불안하다는 신호야.',
      normal: '파형을 다시 봐. 뾰족한 소리가 쉬지 않고 이어지는데, 평소 울음일까?',
    },
    correctTreatment: 'shelter',
    assistTreatment: 'puzzle',
    assistFeedback: '좋은 생각이야. 그런데 먼저 조용히 숨을 곳이 필요해. 퍼즐은 그 다음이야.',
    wrongTreatmentFeedback: {
      water: '물을 줬는데 안 마셔. 왜일까? 이 아이가 힘든 건 목이 아니야.',
      puzzle: '',
      feather: '깃털을 다듬어 줬는데 또 뽑아. 깃털이 문제일까, 뽑게 만드는 게 문제일까?',
      shelter: '',
    },
    zones: [
      zone('eyes', 1, '눈은 또렷하고, 소리가 날 때마다 빠르게 두리번거려.', 1, [
        '눈이 흐리고 반쯤 감겨 있어',
        '눈은 맑은데 계속 두리번거려',
        '눈에서 눈물이 흘러',
      ]),
      zone('feathers', 2, '가슴 쪽 깃털이 듬성듬성 비어 있고, 바닥에 뽑힌 깃털이 떨어져 있어.', 2, [
        '깃털이 윤기 있게 고르게 나 있어',
        '깃털이 물에 젖어 있어',
        '가슴 깃털이 빠져 있고 바닥에 뽑힌 깃털이 있어',
      ]),
      zone('posture', 3, '횃대 끝에 바짝 붙어 서서 몸을 좌우로 계속 흔들어.', 0, [
        '횃대 끝에 붙어 몸을 계속 흔들어',
        '날개가 축 처져 바닥에 닿아',
        '한쪽 다리로 편하게 서서 졸아',
      ]),
      zone('water', 4, '물그릇의 물은 줄어 있고, 먹이는 여기저기 흩뿌려져 있어.', 2, [
        '물이 아침 그대로 남아 있어',
        '먹이를 남김없이 다 먹었어',
        '물은 마셨고 먹이는 흩뿌려져 있어',
      ]),
      zone('behavior', 5, '케이지 안에 숨을 곳이 없고, 옆방에서 큰 소리가 계속 들려와.', 1, [
        '구석에 숨어서 나오지 않아',
        '숨을 곳이 없고 큰 소리가 계속 들려',
        '장난감을 굴리며 놀고 있어',
      ]),
    ],
  },
  {
    id: 'red',
    name: '빨강 앵무',
    issue: '탈수',
    issueLabel: '탈수로 보여',
    sickImage: v2Asset('parrot-sick-red'),
    recoveredImage: pageAsset(5, 4),
    cue: 'parrotCall',
    soundHint: '낮고 부드러운 소리를 가끔 한 번씩 내. 파형이 둥글고 드문드문해.',
    soundAnswer: 'normal',
    soundFeedback: {
      normal: '맞아. 소리는 평소랑 같아. 이 아이 문제는 소리가 아니라 다른 데 있어.',
      abnormal: '파형을 다시 봐. 둥글고 느린 소리는 건강한 앵무 울음이야. 아픈 데가 꼭 소리로 나타날까?',
    },
    correctTreatment: 'water',
    wrongTreatmentFeedback: {
      shelter: '은신처에 들어갔는데 그대로 축 늘어져 있어. 몸에 부족한 게 뭘까?',
      puzzle: '퍼즐 앞에서 꼼짝도 안 해. 먹이보다 먼저 채워야 할 게 있지 않을까?',
      feather: '깃털은 다듬었는데 눈은 여전히 흐려. 깃털이 원인이었을까?',
      water: '',
    },
    zones: [
      zone('eyes', 1, '눈이 흐리고 반쯤 감겨 있어. 불러도 눈을 천천히 떠.', 2, [
        '눈이 맑고 빠르게 두리번거려',
        '눈 주위가 빨갛게 부어 있어',
        '눈이 흐리고 반쯤 감겨 있어',
      ]),
      zone('feathers', 2, '깃털이 푸석하고 윤기가 없지만, 빠지거나 뽑힌 자리는 없어.', 0, [
        '깃털이 푸석하지만 뽑힌 자리는 없어',
        '가슴 깃털이 뽑혀 있어',
        '깃털이 기름져 번들거려',
      ]),
      zone('posture', 3, '날개가 축 처져 있고, 횃대 대신 바닥 가까이 웅크려 있어.', 1, [
        '횃대 끝에서 몸을 흔들어',
        '날개가 처지고 바닥 가까이 웅크려 있어',
        '날개를 활짝 펴고 있어',
      ]),
      zone('water', 4, '물그릇 물이 아침 표시선 그대로야. 부리 가장자리가 말라 있어.', 1, [
        '물을 자주 마시러 내려와',
        '물이 아침 그대로고 부리가 말라 있어',
        '물그릇이 엎어져 바닥이 젖었어',
      ]),
      zone('behavior', 5, '거의 움직이지 않고, 불러도 한참 뒤에 천천히 고개만 돌려.', 2, [
        '소리를 지르며 돌아다녀',
        '숨을 곳을 찾아 이리저리 다녀',
        '움직임이 거의 없고 반응이 느려',
      ]),
    ],
  },
];

export const getBird = (id: BirdId): Bird => BIRDS.find((bird) => bird.id === id) ?? BIRDS[0]!;
export const getTreatment = (id: TreatmentId): Treatment => TREATMENTS.find((item) => item.id === id) ?? TREATMENTS[0]!;
