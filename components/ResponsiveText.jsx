import React from 'react';
import { Text } from 'react-native';
import theme from '../constants/theme';

const ResponsiveText = ({
  children,
  variant = 'body',
  size = 'md',
  weight = 'regular',
  color = 'primary',
  align = 'left',
  style,
  numberOfLines,
  ...props
}) => {
  const getTextStyle = () => {
    const baseStyle = {
      color: theme.colors.text[color] || theme.colors[color] || color,
      textAlign: align,
    };

    const variantStyle = {
      h1: {
        fontSize: theme.fontSize.xxxl,
        fontWeight: 'bold',
        lineHeight: theme.fontSize.xxxl * 1.2,
      },
      h2: {
        fontSize: theme.fontSize.xxl,
        fontWeight: 'bold',
        lineHeight: theme.fontSize.xxl * 1.2,
      },
      h3: {
        fontSize: theme.fontSize.xl,
        fontWeight: '600',
        lineHeight: theme.fontSize.xl * 1.2,
      },
      h4: {
        fontSize: theme.fontSize.lg,
        fontWeight: '600',
        lineHeight: theme.fontSize.lg * 1.2,
      },
      body: {
        fontSize: theme.fontSize.md,
        fontWeight: '400',
        lineHeight: theme.fontSize.md * 1.4,
      },
      caption: {
        fontSize: theme.fontSize.sm,
        fontWeight: '400',
        lineHeight: theme.fontSize.sm * 1.4,
      },
      label: {
        fontSize: theme.fontSize.sm,
        fontWeight: '500',
        lineHeight: theme.fontSize.sm * 1.2,
      },
      button: {
        fontSize: theme.fontSize.md,
        fontWeight: '600',
        lineHeight: theme.fontSize.md * 1.2,
      },
    };

    const sizeStyle = {
      xs: {
        fontSize: theme.fontSize.xs,
      },
      sm: {
        fontSize: theme.fontSize.sm,
      },
      md: {
        fontSize: theme.fontSize.md,
      },
      lg: {
        fontSize: theme.fontSize.lg,
      },
      xl: {
        fontSize: theme.fontSize.xl,
      },
      xxl: {
        fontSize: theme.fontSize.xxl,
      },
      xxxl: {
        fontSize: theme.fontSize.xxxl,
      },
    };

    const weightStyle = {
      light: {
        fontWeight: '300',
      },
      regular: {
        fontWeight: '400',
      },
      medium: {
        fontWeight: '500',
      },
      semibold: {
        fontWeight: '600',
      },
      bold: {
        fontWeight: '700',
      },
    };

    return [
      baseStyle,
      variantStyle[variant],
      sizeStyle[size],
      weightStyle[weight],
      style,
    ];
  };

  return (
    <Text 
      style={getTextStyle()} 
      numberOfLines={numberOfLines}
      {...props}
    >
      {children}
    </Text>
  );
};

export default ResponsiveText; 