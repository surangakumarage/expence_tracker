import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { IconName } from './ui';

/** Same keys as the web app so backups are interchangeable. */
export const ICONS: Record<string, IconName> = {
  utensils: 'restaurant', 'shopping-cart': 'cart', car: 'car', home: 'home', zap: 'flash',
  'shopping-bag': 'bag-handle', 'heart-pulse': 'medkit', film: 'film', 'graduation-cap': 'school',
  repeat: 'repeat', circle: 'ellipse', briefcase: 'briefcase', laptop: 'laptop', gift: 'gift',
  'plus-circle': 'add-circle', plane: 'airplane', coffee: 'cafe', dumbbell: 'barbell', 'paw-print': 'paw',
  baby: 'happy', smartphone: 'phone-portrait', fuel: 'speedometer', shirt: 'shirt', landmark: 'business',
  'piggy-bank': 'wallet', wrench: 'construct',
};

export function CategoryIcon({ icon, color = '#64748b', size = 40 }: { icon?: string; color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: `${color}22`, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={(icon && ICONS[icon]) || 'ellipse'} size={Math.round(size * 0.5)} color={color} />
    </View>
  );
}
