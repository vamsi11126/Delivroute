/**
 * Minimal design tokens for the mobile app. Keep it small and flat — white
 * background, a single blue primary, neutral greys for text/borders.
 */
export const colors = {
  primary: '#1A56DB',
  primaryPressed: '#1647B4',
  primaryDisabled: '#9DB4E8',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  text: '#111827',
  textMuted: '#6B7280',
  border: '#D1D5DB',
  borderFocused: '#1A56DB',
  error: '#DC2626',
  success: '#059669',
  warningBg: '#FEF3C7',
  warningBorder: '#FDE68A',
  warningText: '#92400E',
  white: '#FFFFFF',
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;
