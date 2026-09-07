import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { label?: string };

function BaseIcon({ label, children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} {...props}>
      {label && <title>{label}</title>}
      {children}
    </svg>
  );
}

export const HomeIcon = (props: IconProps) => <BaseIcon {...props}><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></BaseIcon>;
export const SoundIcon = (props: IconProps) => <BaseIcon {...props}><path d="M5 9H2v6h3l5 4V5L5 9Z"/><path d="M14 9a4 4 0 0 1 0 6M17 6a8 8 0 0 1 0 12"/></BaseIcon>;
export const MutedIcon = (props: IconProps) => <BaseIcon {...props}><path d="M5 9H2v6h3l5 4V5L5 9Z"/><path d="m15 9 6 6m0-6-6 6"/></BaseIcon>;
export const HelpIcon = (props: IconProps) => <BaseIcon {...props}><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1.1.9-1.1 1.7M12 17h.01"/></BaseIcon>;
export const ArrowIcon = (props: IconProps) => <BaseIcon {...props}><path d="m9 18 6-6-6-6"/></BaseIcon>;
export const CheckIcon = (props: IconProps) => <BaseIcon {...props}><path d="m5 12 4 4L19 6"/></BaseIcon>;
export const SearchIcon = (props: IconProps) => <BaseIcon {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></BaseIcon>;
export const SparkIcon = (props: IconProps) => <BaseIcon {...props}><path d="m12 2 1.4 5.1L18 9l-4.6 1.9L12 16l-1.4-5.1L6 9l4.6-1.9L12 2Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/></BaseIcon>;
export const LockIcon = (props: IconProps) => <BaseIcon {...props}><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></BaseIcon>;
export const PrintIcon = (props: IconProps) => <BaseIcon {...props}><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/></BaseIcon>;
export const DownloadIcon = (props: IconProps) => <BaseIcon {...props}><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></BaseIcon>;
export const ClockIcon = (props: IconProps) => <BaseIcon {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></BaseIcon>;
export const GripIcon = (props: IconProps) => <BaseIcon {...props}><circle cx="8" cy="7" r="1" fill="currentColor"/><circle cx="16" cy="7" r="1" fill="currentColor"/><circle cx="8" cy="12" r="1" fill="currentColor"/><circle cx="16" cy="12" r="1" fill="currentColor"/><circle cx="8" cy="17" r="1" fill="currentColor"/><circle cx="16" cy="17" r="1" fill="currentColor"/></BaseIcon>;
/** 손가락으로 누르는 모양 — '여기를 눌러' 안내용 */
export const TapIcon = (props: IconProps) => <BaseIcon {...props}><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" /><path d="M12 10.5a1.5 1.5 0 0 1 3 0V12" /><path d="M15 11.5a1.5 1.5 0 0 1 3 0V13" /><path d="M18 12.5a1.5 1.5 0 0 1 3 0V16c0 3.5-2.5 6-6 6h-2.2c-1.6 0-3.1-.7-4.1-2l-3.3-4.2a1.6 1.6 0 0 1 2.4-2.1L9 15V11" /><path d="M6 3.5 4.5 2M10.5 2.2 11 0.5M2.5 6.5 1 6" /></BaseIcon>;
