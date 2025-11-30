import { memo } from 'react';
import { router } from '@inertiajs/react';

interface BalanceCardProps {
  balance: number;
}

const BalanceCard = memo(({ balance }: BalanceCardProps) => {
  return (
    <div className="relative">
      <div className="bg-gradient-to-br from-[#FF9500] via-[#FF8C00] to-[#E07B00] rounded-[2rem] px-4 pt-4 pb-1 text-white">
        {/* Header with Balance Info */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold">Pipocoin</p>
              <p className="text-sm opacity-80">Balance</p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-3xl font-bold">P {balance.toFixed(2)}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <button
            onClick={() => router.visit('/send')}
            className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md hover:bg-white/30 transition-all"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </button>

          <button
            onClick={() => router.visit('/qrcode')}
            className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md hover:bg-white/30 transition-all"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </button>

          <button
            onClick={() => router.visit('/history')}
            className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md hover:bg-white/30 transition-all"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Recharge Button - Overlapping at bottom */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-[65%]">
        <button className="w-full bg-white hover:bg-gray-50 text-[#FF8C00] font-bold py-1 px-2 rounded-2xl transition-all flex items-center justify-center gap-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="text-xs">Recharger Wallet</span>
        </button>
      </div>
    </div>
  );
});

BalanceCard.displayName = 'BalanceCard';

export default BalanceCard;
