import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

export function IconBox(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5v-9Z" />
      <path d="M3.5 7.5 12 12l8.5-4.5" />
      <path d="M12 12v9" />
    </svg>
  );
}

export function IconLayers(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 4 8l8 4.5L20 8Z" />
      <path d="M4 12.5 12 17l8-4.5" />
      <path d="M4 16.5 12 21l8-4.5" />
    </svg>
  );
}

export function IconCart(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 4.5h2l1.6 10.4a1.5 1.5 0 0 0 1.5 1.3h8.4a1.5 1.5 0 0 0 1.48-1.24l1.27-6.96H6.4" />
      <circle cx="9.5" cy="20" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="20" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconReceipt(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3h12v18l-2.5-1.5L13 21l-1.5-1.5L10 21l-2.5-1.5L5 21V3Z" />
      <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4.5" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19.5c.7-3 2.7-4.5 5.5-4.5s4.8 1.5 5.5 4.5" />
      <path d="M15.5 5.3c1.3.4 2.2 1.5 2.2 2.9 0 1.4-.9 2.5-2.2 2.9" />
      <path d="M15.8 15c2.3.3 3.9 1.7 4.5 4.5" />
    </svg>
  );
}

export function IconTag(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M11.5 3.5H19a1 1 0 0 1 1 1v7.5a1 1 0 0 1-.3.7l-8 8a1 1 0 0 1-1.4 0l-7.2-7.2a1 1 0 0 1 0-1.4l8-8a1 1 0 0 1 .4-.6Z" />
      <circle cx="15.5" cy="8" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconStamp(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 3.5h6a2 2 0 0 1 2 2v3.7a3.5 3.5 0 0 1-1.2 2.6l-.8.7a2 2 0 0 0-.7 1.5v.5h-6.6v-.5a2 2 0 0 0-.7-1.5l-.8-.7A3.5 3.5 0 0 1 5 9.2V5.5a2 2 0 0 1 2-2h2Z" />
      <path d="M4 20.5h16" />
      <path d="M6.5 20.5v-2.8a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5v2.8" />
    </svg>
  );
}

export function IconIdCard(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="1" />
      <circle cx="8.3" cy="11" r="1.8" />
      <path d="M5.3 16c.4-1.6 1.5-2.4 3-2.4s2.6.8 3 2.4" />
      <path d="M14 9.5h4.5M14 12.5h4.5" />
    </svg>
  );
}

export function IconStore(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 9.5 5 4h14l1 5.5" />
      <path d="M4 9.5a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5.5h4V20" />
    </svg>
  );
}

export function IconFolder(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4.2l1.6 2h8.7a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19.5 19h-14a1.5 1.5 0 0 1-2-1.5Z" />
    </svg>
  );
}

export function IconCamera(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5Z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  );
}
