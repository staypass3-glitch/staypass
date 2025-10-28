import React from 'react';
import { ScrollView, View } from 'react-native';
import theme from '../constants/theme';

const ResponsiveLayout = ({
  children,
  type = 'container',
  padding = 'md',
  margin = 'md',
  spacing = 'md',
  direction = 'column',
  align = 'stretch',
  justify = 'flex-start',
  wrap = false,
  scrollable = false,
  style,
  contentContainerStyle,
  ...props
}) => {
  const getContainerStyle = () => {
    const baseStyle = {
      flex: 1,
    };

    const typeStyle = {
      container: {
        flex: 1,
        backgroundColor: theme.colors.background,
      },
      card: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.lg,
        ...theme.shadows.md,
      },
      section: {
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.md,
      },
      row: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      column: {
        flexDirection: 'column',
      },
    };

    const paddingStyle = {
      none: {},
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

    const flexStyle = {
      flexDirection: direction,
      alignItems: align,
      justifyContent: justify,
      flexWrap: wrap ? 'wrap' : 'nowrap',
    };

    return [
      baseStyle,
      typeStyle[type],
      paddingStyle[padding],
      marginStyle[margin],
      flexStyle,
      style,
    ];
  };

  const getContentContainerStyle = () => {
    const baseStyle = {
      flexGrow: 1,
    };

    const spacingStyle = {
      none: {},
      xs: {
        gap: theme.spacing.xs,
      },
      sm: {
        gap: theme.spacing.sm,
      },
      md: {
        gap: theme.spacing.md,
      },
      lg: {
        gap: theme.spacing.lg,
      },
      xl: {
        gap: theme.spacing.xl,
      },
    };

    return [
      baseStyle,
      spacingStyle[spacing],
      contentContainerStyle,
    ];
  };

  if (scrollable) {
    return (
      <ScrollView
        style={getContainerStyle()}
        contentContainerStyle={getContentContainerStyle()}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        {...props}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={getContainerStyle()} {...props}>
      {children}
    </View>
  );
};

export default ResponsiveLayout; 