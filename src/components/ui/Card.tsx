import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const variants = {
      default: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
      outlined: 'bg-transparent border-2 border-gray-300 dark:border-gray-700',
      elevated:
        'bg-white dark:bg-gray-900 shadow-lg hover:shadow-xl transition-shadow',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-xl', variants[variant], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-6 py-4 border-b border-gray-200 dark:border-gray-800', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-6 py-4', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-6 py-4 border-t border-gray-200 dark:border-gray-800', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

export default Card;
