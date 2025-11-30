interface DefaultAvatarProps {
  name: string;
  size?: number;
  className?: string;
}

export default function DefaultAvatar({ name, size = 80, className = '' }: DefaultAvatarProps) {
  // Get initials from name
  const getInitials = (fullName: string): string => {
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const initials = getInitials(name);
  
  // Generate a color based on the name (consistent for the same name)
  const getColor = (name: string): string => {
    const colors = [
      '#FF8C00', '#FF9500', '#FF6B35', '#F7931E', '#FFB84D',
      '#FF6B9D', '#C44569', '#A8E6CF', '#4ECDC4', '#45B7D1',
      '#96CEB4', '#FFEAA7', '#DDA15E', '#BC6C25', '#606C38',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const bgColor = getColor(name);

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        fontSize: size * 0.4,
      }}
    >
      {initials}
    </div>
  );
}

