import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import theme from '../constants/theme';

const ResponsiveInput = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  autoCorrect = true,
  multiline = false,
  numberOfLines = 1,
  icon,
  iconPosition = 'left',
  onIconPress,
  error,
  disabled = false,
  style,
  inputStyle,
  labelStyle,
  errorStyle,
  ...props
}) => {
  const getContainerStyle = () => {
    const baseStyle = {
      marginBottom: theme.spacing.md,
    };

    const errorStyle = error ? {
      borderColor: theme.colors.danger,
    } : {};

    const disabledStyle = disabled ? {
      opacity: 0.6,
    } : {};

    return [
      baseStyle,
      errorStyle,
      disabledStyle,
      style,
    ];
  };

  const getInputContainerStyle = () => {
    const baseStyle = {
      flexDirection: 'row',
      alignItems: multiline ? 'flex-start' : 'center',
      borderWidth: 1,
      borderColor: error ? theme.colors.danger : theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.white,
      paddingHorizontal: theme.spacing.md,
      ...theme.shadows.sm,
    };

    const sizeStyle = {
      sm: {
        height: theme.inputHeight.sm,
        paddingVertical: theme.spacing.sm,
      },
      md: {
        height: theme.inputHeight.md,
        paddingVertical: theme.spacing.md,
      },
      lg: {
        height: theme.inputHeight.lg,
        paddingVertical: theme.spacing.lg,
      },
    };

    return [
      baseStyle,
      sizeStyle.md, // Default to medium size
    ];
  };

  const getInputStyle = () => {
    const baseStyle = {
      flex: 1,
      fontSize: theme.fontSize.md,
      color: theme.colors.text.primary,
      paddingVertical: 0, // Remove default padding
    };

    const multilineStyle = multiline ? {
      textAlignVertical: 'top',
      paddingTop: theme.spacing.sm,
    } : {};

    const iconStyle = icon ? {
      marginLeft: iconPosition === 'left' ? theme.spacing.sm : 0,
      marginRight: iconPosition === 'right' ? theme.spacing.sm : 0,
    } : {};

    return [
      baseStyle,
      multilineStyle,
      iconStyle,
      inputStyle,
    ];
  };

  const getLabelStyle = () => {
    const baseStyle = {
      fontSize: theme.fontSize.sm,
      fontWeight: '500',
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.xs,
    };

    return [
      baseStyle,
      labelStyle,
    ];
  };

  const getErrorStyle = () => {
    const baseStyle = {
      fontSize: theme.fontSize.xs,
      color: theme.colors.danger,
      marginTop: theme.spacing.xs,
    };

    return [
      baseStyle,
      errorStyle,
    ];
  };

  const getIconStyle = () => {
    return {
      size: theme.iconSize.md,
      color: theme.colors.gray,
      style: {
        marginRight: iconPosition === 'left' ? theme.spacing.sm : 0,
        marginLeft: iconPosition === 'right' ? theme.spacing.sm : 0,
      },
    };
  };

  const iconConfig = getIconStyle();

  return (
    <View style={getContainerStyle()}>
      {label && (
        <Text style={getLabelStyle()}>{label}</Text>
      )}
      
      <View style={getInputContainerStyle()}>
        {icon && iconPosition === 'left' && (
          <TouchableOpacity
            onPress={onIconPress}
            disabled={!onIconPress}
            style={{ justifyContent: 'center' }}
          >
            <MaterialIcons 
              name={icon} 
              size={iconConfig.size} 
              color={iconConfig.color}
              style={iconConfig.style}
            />
          </TouchableOpacity>
        )}
        
        <TextInput
          style={getInputStyle()}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.light}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={!disabled}
          {...props}
        />
        
        {icon && iconPosition === 'right' && (
          <TouchableOpacity
            onPress={onIconPress}
            disabled={!onIconPress}
            style={{ justifyContent: 'center' }}
          >
            <MaterialIcons 
              name={icon} 
              size={iconConfig.size} 
              color={iconConfig.color}
              style={iconConfig.style}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text style={getErrorStyle()}>{error}</Text>
      )}
    </View>
  );
};

export default ResponsiveInput; 