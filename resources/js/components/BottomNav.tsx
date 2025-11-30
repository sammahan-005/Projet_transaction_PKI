import { memo } from 'react';
import { router } from '@inertiajs/react';
import { QrCode } from 'lucide-react';

const BottomNav = memo(() => {
  const currentUrl = typeof window !== 'undefined' ? window.location.pathname : '';

  const isActive = (path: string) => currentUrl === path || currentUrl === `/dashboard${path}`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white pb-safe">
      <div className="max-w-md mx-auto px-6">
        <div className="flex items-center justify-around py-4 relative">
          {/* Home */}
          <button
            onClick={() => router.visit('/dashboard')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive('/dashboard') || currentUrl === '/' ? 'text-[#FF8C00]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
          </button>

          {/* History */}
          <button
            onClick={() => router.visit('/history')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive('/history') ? 'text-[#FF8C00]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
            </svg>
          </button>

          {/* Center Action Button - Scan */}
          <button
            onClick={() => router.visit('/scan')}
            className="w-14 h-14 bg-[#FF8C00] rounded-full flex items-center justify-center -mt-6 transition-transform hover:scale-105 hover:bg-[#E07B00]"
          >
            <QrCode className="w-7 h-7 text-white" />
          </button>

          {/* Send Money */}
          <button
            onClick={() => router.visit('/send')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive('/send') || isActive('/send-amount') ? 'text-[#FF8C00]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z" />
            </svg>
          </button>

          {/* Profile */}
          <button
            onClick={() => router.visit('/profile')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive('/profile') ? 'text-[#FF8C00]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';

export default BottomNav;
