/** Sidebar and toolbar icons — inline so a panel never waits on a font. */

type Props = { className?: string };

const wrap = (path: React.ReactNode) =>
  function Icon({ className }: Props) {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {path}
      </svg>
    );
  };

const s = { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.6 } as const;

export const HomeIcon = wrap(<path {...s} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" />);
export const UsersIcon = wrap(<path {...s} d="M17 20h5v-1a4 4 0 00-3-3.87M9 20H2v-1a4 4 0 013-3.87m0 0a4 4 0 015.9 0M9 7a3 3 0 116 0 3 3 0 01-6 0zm10 4a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />);
export const UserPlusIcon = wrap(<path {...s} d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6" />);
export const ClipboardIcon = wrap(<path {...s} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />);
export const CheckBadgeIcon = wrap(<path {...s} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />);
export const BuildingIcon = wrap(<path {...s} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />);
export const BookIcon = wrap(<path {...s} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />);
export const LibraryIcon = wrap(<path {...s} d="M4 6h16M4 10h16M4 14h16M4 18h16M8 6v12m8-12v12" />);
export const CogIcon = wrap(<><path {...s} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path {...s} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>);
export const SearchIcon = wrap(<path {...s} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />);
export const DownloadIcon = wrap(<path {...s} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />);
export const PencilIcon = wrap(<path {...s} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />);
export const TrashIcon = wrap(<path {...s} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />);
export const CoinIcon = wrap(<path {...s} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 9v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />);
export const AlertIcon = wrap(<path {...s} d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.71-3.03l-6.93-11.6a2 2 0 00-3.42 0l-6.93 11.6A2 2 0 005.07 19z" />);
export const PlusIcon = wrap(<path {...s} d="M12 5v14M5 12h14" />);
export const ChevronLeft = wrap(<path {...s} d="M15 19l-7-7 7-7" />);
export const ChevronRight = wrap(<path {...s} d="M9 5l7 7-7 7" />);
