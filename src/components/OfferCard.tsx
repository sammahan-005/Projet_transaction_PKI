import { memo } from 'react';

interface OfferCardProps {
  title: string;
  description: string;
  badge?: string;
  onAction: () => void;
}

const OfferCard = memo(({ title, description, badge, onAction }: OfferCardProps) => {
  return (
    <div className="bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-2xl p-4 shadow-sm border border-yellow-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-800 mb-1">{title}</h3>
          <p className="text-xs text-gray-600 mb-3">{description}</p>
          <button
            onClick={onAction}
            className="bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-semibold text-xs py-2 px-4 rounded-lg transition-colors"
          >
            Recharger now!
          </button>
        </div>
        <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center shadow-sm">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      </div>
    </div>
  );
});

OfferCard.displayName = 'OfferCard';

export default OfferCard;
