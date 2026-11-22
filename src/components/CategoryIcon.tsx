import {
  Briefcase, Car, Circle, Film, Gift, GraduationCap, HeartPulse, Home, Laptop, PlusCircle,
  Repeat, ShoppingBag, ShoppingCart, Utensils, Zap, Plane, Coffee, Dumbbell, PawPrint, Baby,
  Smartphone, Fuel, Shirt, Landmark, PiggyBank, Wrench, type LucideIcon,
} from 'lucide-react';

export const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils, 'shopping-cart': ShoppingCart, car: Car, home: Home, zap: Zap,
  'shopping-bag': ShoppingBag, 'heart-pulse': HeartPulse, film: Film, 'graduation-cap': GraduationCap,
  repeat: Repeat, circle: Circle, briefcase: Briefcase, laptop: Laptop, gift: Gift,
  'plus-circle': PlusCircle, plane: Plane, coffee: Coffee, dumbbell: Dumbbell, 'paw-print': PawPrint,
  baby: Baby, smartphone: Smartphone, fuel: Fuel, shirt: Shirt, landmark: Landmark,
  'piggy-bank': PiggyBank, wrench: Wrench,
};

export function CategoryIcon({ icon, color, size = 36 }: { icon?: string; color?: string; size?: number }) {
  const Icon = (icon && ICONS[icon]) || Circle;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-xl"
      style={{ width: size, height: size, background: `${color ?? '#64748b'}22`, color: color ?? '#64748b' }}
    >
      <Icon size={Math.round(size * 0.5)} />
    </span>
  );
}
