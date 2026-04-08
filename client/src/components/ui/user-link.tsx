import { Link } from "wouter";

interface UserLinkProps {
  userId: string;
  userType?: string;
  name: string;
  className?: string;
  showIcon?: boolean;
}

export function UserLink({ userId, userType, name, className, showIcon }: UserLinkProps) {
  const href = userType === 'brand' ? `/brand/${userId}` : `/profile/${userId}`;
  return (
    <Link
      href={href}
      className={`hover:underline cursor-pointer text-blue-600 hover:text-blue-800 transition-colors ${className || ''}`}
    >
      {name}
    </Link>
  );
}

export function getUserProfileUrl(userId: string, userType?: string): string {
  return userType === 'brand' ? `/brand/${userId}` : `/profile/${userId}`;
}
