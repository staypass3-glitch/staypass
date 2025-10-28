import React from 'react';
import { View } from 'react-native';
import theme from '../constants/theme';

const ResponsiveCard = ({
  children,
  variant = 'default',
  padding = 'md',
  margin = 'md',
  style,
  ...props
}) => {
  const getCardStyle = () => {
    const baseStyle = {
      backgroundColor: theme.colors.white,
      borderRadius: theme.borderRadius.lg,
      ...theme.shadows.md,
    };

    const variantStyle = {
      default: {
        backgroundColor: theme.colors.white,
      },
      primary: {
        backgroundColor: theme.colors.light,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
      },
      success: {
        backgroundColor: theme.colors.light,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.success,
      },
      warning: {
        backgroundColor: theme.colors.light,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.warning,
      },
      danger: {
        backgroundColor: theme.colors.light,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.danger,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.border,
      },
    };

    const paddingStyle = {
      xs: {
        padding: theme.spacing.xs,
      },
      sm: {
        padding: theme.spacing.sm,
      },
      md: {
        padding: theme.spacing.md,
      },
      lg: {
        padding: theme.spacing.lg,
      },
      xl: {
        padding: theme.spacing.xl,
      },
    };

    const marginStyle = {
      none: {},
      xs: {
        margin: theme.spacing.xs,
      },
      sm: {
        margin: theme.spacing.sm,
      },
      md: {
        margin: theme.spacing.md,
      },
      lg: {
        margin: theme.spacing.lg,
      },
      xl: {
        margin: theme.spacing.xl,
      },
    };

    return [
      baseStyle,
      variantStyle[variant],
      paddingStyle[padding],
      marginStyle[margin],
      style,
    ];
  };

  return (
    <View style={getCardStyle()} {...props}>
      {children}
    </View>
  );
};

export default ResponsiveCard; 