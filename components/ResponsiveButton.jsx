import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import theme from '../constants/theme';

const ResponsiveButton = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  ...props
}) => {
  const getButtonStyle = () => {
    const baseStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.lg,
      ...theme.shadows.md,
    };

    const sizeStyle = {
      sm: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        height: theme.buttonHeight.sm,
      },
      md: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        height: theme.buttonHeight.md,
      },
      lg: {
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: theme.spacing.xl,
        height: theme.buttonHeight.lg,
      },
    };

    const variantStyle = {
      primary: {
        backgroundColor: theme.colors.primary,
      },
      secondary: {
        backgroundColor: theme.colors.secondary,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: theme.colors.primary,
      },
      danger: {
        backgroundColor: theme.colors.danger,
      },
      success: {
        backgroundColor: theme.colors.success,
      },
      ghost: {
        backgroundColor: 'transparent',
      },
    };

    const disabledStyle = disabled ? {
      opacity: 0.6,
    } : {};

    return [
      baseStyle,
      sizeStyle[size],
      variantStyle[variant],
      disabledStyle,
      style,
    ];
  };

  const getTextStyle = () => {
    const baseTextStyle = {
      fontSize: theme.fontSize.md,
      fontWeight: '600',
      textAlign: 'center',
    };

    const variantTextStyle = {
      primary: {
        color: theme.colors.white,
      },
      secondary: {
        color: theme.colors.white,
      },
      outline: {
        color: theme.colors.primary,
      },
      danger: {
        color: theme.colors.white,
      },
      success: {
        color: theme.colors.white,
      },
      ghost: {
        color: theme.colors.primary,
      },
    };

    const disabledTextStyle = disabled ? {
      opacity: 0.6,
    } : {};

    return [
      baseTextStyle,
      variantTextStyle[variant],
      disabledTextStyle,
      textStyle,
    ];
  };

  const getIconStyle = () => {
    const iconSize = {
      sm: theme.iconSize.sm,
      md: theme.iconSize.md,
      lg: theme.iconSize.lg,
    };

    return {
      size: iconSize[size],
      color: variant === 'outline' || variant === 'ghost' 
        ? theme.colors.primary 
        : theme.colors.white,
      style: {
        marginRight: iconPosition === 'left' ? theme.spacing.sm : 0,
        marginLeft: iconPosition === 'right' ? theme.spacing.sm : 0,
      },
    };
  };

  const iconConfig = getIconStyle();

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'outline' || variant === 'ghost' 
            ? theme.colors.primary 
            : theme.colors.white} 
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <MaterialIcons 
              name={icon} 
              size={iconConfig.size} 
              color={iconConfig.color}
              style={iconConfig.style}
            />
          )}
          <Text style={getTextStyle()}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <MaterialIcons 
              name={icon} 
              size={iconConfig.size} 
              color={iconConfig.color}
              style={iconConfig.style}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

export default ResponsiveButton; 