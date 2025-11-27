import responsiveDimensions from './responsive.js';

// constants/theme.js
const colors = {
  primary: '#2563eb',
  secondary: '#3b82f6',
  tertiary: '#60a5fa',
  light: '#eff6ff',
  white: '#ffffff',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  dark: '#1e293b',
  gray: '#6b7280',
  background: '#f8fafc',
  border: '#e5e7eb',
  lightgray: '#D3D3D3',
  text: {
    primary: '#1e293b',
    secondary: '#6b7280',
    light: '#9ca3af',
    white: '#ffffff',
  },
  status: {
    active: '#10b981',
    inactive: '#6b7280',
    pending: '#f59e0b',
    error: '#ef4444',
  },
};

const spacing = responsiveDimensions.spacing;
const borderRadius = responsiveDimensions.borderRadius;
const fontSize = responsiveDimensions.fontSize;
const iconSize = responsiveDimensions.iconSize;
const buttonHeight = responsiveDimensions.buttonHeight;
const inputHeight = responsiveDimensions.inputHeight;

const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

const gradients = {
  primary: ['#2563eb', '#3b82f6', '#60a5fa'],
  secondary: ['#1e293b', '#334155', '#475569'],
  success: ['#10b981', '#34d399', '#6ee7b7'],
  danger: ['#ef4444', '#f87171', '#fca5a5'],
};

export default {
  colors,
  spacing,
  borderRadius,
  fontSize,
  iconSize,
  buttonHeight,
  inputHeight,
  shadows,
  gradients,
  responsive: responsiveDimensions,
};