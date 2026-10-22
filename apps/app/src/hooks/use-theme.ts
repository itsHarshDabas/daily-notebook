import type { Palette } from '@/constants/theme';
import { useAppTheme } from '@/lib/theme';

export function useTheme(): Palette {
  return useAppTheme().colors;
}
