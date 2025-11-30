import { memo } from 'react';

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const QuickActionButton = memo(({ icon, label, onClick }: QuickActionButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity"
    >
      <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center">
        {icon}
      </div>
      <span className="text-xs text-gray-600 font-medium">{label}</span>
    </button>
  );
});

QuickActionButton.displayName = 'QuickActionButton';

export default QuickActionButton;
