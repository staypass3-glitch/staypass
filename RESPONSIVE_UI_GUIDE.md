# Responsive UI System Guide

## Overview
This guide explains how to use the responsive UI system to ensure consistent design across all devices (phones, tablets, different screen sizes).

## Core Components

### 1. ResponsiveButton
A button component that adapts to different screen sizes.

```jsx
import { ResponsiveButton } from '../components';

// Basic usage
<ResponsiveButton 
  title="Sign In" 
  onPress={handleSignIn} 
/>

// With variants
<ResponsiveButton 
  title="Delete" 
  variant="danger" 
  size="sm"
  onPress={handleDelete} 
/>

// With icons
<ResponsiveButton 
  title="Add Item" 
  icon="add" 
  iconPosition="left"
  onPress={handleAdd} 
/>

// Loading state
<ResponsiveButton 
  title="Submit" 
  loading={true}
  onPress={handleSubmit} 
/>
```

**Variants:** `primary`, `secondary`, `outline`, `danger`, `success`, `ghost`
**Sizes:** `sm`, `md`, `lg`

### 2. ResponsiveInput
An input component with responsive sizing and consistent styling.

```jsx
import { ResponsiveInput } from '../components';

// Basic input
<ResponsiveInput 
  label="Email"
  placeholder="Enter your email"
  value={email}
  onChangeText={setEmail}
/>

// With icons
<ResponsiveInput 
  label="Password"
  placeholder="Enter password"
  secureTextEntry={true}
  icon="lock"
  value={password}
  onChangeText={setPassword}
/>

// With error
<ResponsiveInput 
  label="Username"
  placeholder="Enter username"
  value={username}
  onChangeText={setUsername}
  error="Username is required"
/>
```

### 3. ResponsiveCard
A card component with responsive padding and margins.

```jsx
import { ResponsiveCard } from '../components';

// Basic card
<ResponsiveCard>
  <Text>Card content</Text>
</ResponsiveCard>

// With variants
<ResponsiveCard variant="primary" padding="lg">
  <Text>Primary card with large padding</Text>
</ResponsiveCard>

// Outline card
<ResponsiveCard variant="outline" margin="none">
  <Text>Outline card without margin</Text>
</ResponsiveCard>
```

**Variants:** `default`, `primary`, `success`, `warning`, `danger`, `outline`
**Padding:** `xs`, `sm`, `md`, `lg`, `xl`
**Margin:** `none`, `xs`, `sm`, `md`, `lg`, `xl`

### 4. ResponsiveText
A text component with responsive font sizes.

```jsx
import { ResponsiveText } from '../components';

// Basic text
<ResponsiveText>Hello World</ResponsiveText>

// Headings
<ResponsiveText variant="h1">Main Heading</ResponsiveText>
<ResponsiveText variant="h2">Sub Heading</ResponsiveText>

// With custom styling
<ResponsiveText 
  variant="body" 
  size="lg" 
  weight="bold" 
  color="primary"
  align="center"
>
  Custom styled text
</ResponsiveText>
```

**Variants:** `h1`, `h2`, `h3`, `h4`, `body`, `caption`, `label`, `button`
**Sizes:** `xs`, `sm`, `md`, `lg`, `xl`, `xxl`, `xxxl`
**Weights:** `light`, `regular`, `medium`, `semibold`, `bold`
**Colors:** `primary`, `secondary`, `danger`, `success`, `warning`, `text.primary`, `text.secondary`, etc.

### 5. ResponsiveLayout
A layout component for consistent spacing and structure.

```jsx
import { ResponsiveLayout } from '../components';

// Basic container
<ResponsiveLayout>
  <Text>Content</Text>
</ResponsiveLayout>

// Scrollable layout
<ResponsiveLayout scrollable spacing="lg">
  <Text>Item 1</Text>
  <Text>Item 2</Text>
  <Text>Item 3</Text>
</ResponsiveLayout>

// Row layout
<ResponsiveLayout 
  type="row" 
  direction="row" 
  align="center" 
  justify="space-between"
  spacing="md"
>
  <Text>Left</Text>
  <Text>Right</Text>
</ResponsiveLayout>
```

**Types:** `container`, `card`, `section`, `row`, `column`
**Directions:** `row`, `column`
**Align:** `stretch`, `center`, `flex-start`, `flex-end`
**Justify:** `flex-start`, `center`, `flex-end`, `space-between`, `space-around`

## Theme System

### Colors
```jsx
import theme from '../constants/theme';

// Primary colors
theme.colors.primary    // #2563eb
theme.colors.secondary  // #3b82f6
theme.colors.tertiary   // #60a5fa

// Text colors
theme.colors.text.primary   // #1e293b
theme.colors.text.secondary // #6b7280
theme.colors.text.light     // #9ca3af

// Status colors
theme.colors.status.active   // #10b981
theme.colors.status.inactive // #6b7280
theme.colors.status.pending  // #f59e0b
theme.colors.status.error    // #ef4444
```

### Spacing
```jsx
// Responsive spacing
theme.spacing.xs  // 4px (scaled)
theme.spacing.sm  // 8px (scaled)
theme.spacing.md  // 16px (scaled)
theme.spacing.lg  // 24px (scaled)
theme.spacing.xl  // 32px (scaled)
theme.spacing.xxl // 48px (scaled)
```

### Font Sizes
```jsx
// Responsive font sizes
theme.fontSize.xs   // 12px (scaled)
theme.fontSize.sm   // 14px (scaled)
theme.fontSize.md   // 16px (scaled)
theme.fontSize.lg   // 20px (scaled)
theme.fontSize.xl   // 24px (scaled)
theme.fontSize.xxl  // 28px (scaled)
theme.fontSize.xxxl // 32px (scaled)
```

## Device Detection

```jsx
import theme from '../constants/theme';

// Check device type
theme.responsive.isSmallDevice   // < 375px
theme.responsive.isMediumDevice  // 375px - 414px
theme.responsive.isLargeDevice   // 414px - 768px
theme.responsive.isTablet        // >= 768px

// Responsive scaling
theme.responsive.scale           // Width scale factor
theme.responsive.verticalScale   // Height scale factor
theme.responsive.moderateScale   // Moderate scaling function
```

## Best Practices

### 1. Use Responsive Components
Always use the responsive components instead of basic React Native components for consistent styling.

```jsx
// ✅ Good
<ResponsiveText variant="h1">Title</ResponsiveText>
<ResponsiveButton title="Submit" onPress={handleSubmit} />

// ❌ Avoid
<Text style={{ fontSize: 16 }}>Title</Text>
<TouchableOpacity style={styles.button}>
  <Text>Submit</Text>
</TouchableOpacity>
```

### 2. Use Theme Colors
Always use theme colors instead of hardcoded values.

```jsx
// ✅ Good
<View style={{ backgroundColor: theme.colors.primary }} />

// ❌ Avoid
<View style={{ backgroundColor: '#2563eb' }} />
```

### 3. Use Responsive Spacing
Use theme spacing for consistent margins and padding.

```jsx
// ✅ Good
<View style={{ margin: theme.spacing.md }} />

// ❌ Avoid
<View style={{ margin: 16 }} />
```

### 4. Handle Different Screen Sizes
Use device detection for conditional styling.

```jsx
const styles = {
  container: {
    padding: theme.responsive.isTablet 
      ? theme.spacing.xl 
      : theme.spacing.md,
  },
};
```

## Example: Complete Screen

```jsx
import React from 'react';
import { 
  ResponsiveLayout, 
  ResponsiveText, 
  ResponsiveButton, 
  ResponsiveInput,
  ResponsiveCard,
  ScreenWrapper 
} from '../components';
import theme from '../constants/theme';

const ExampleScreen = () => {
  return (
    <ScreenWrapper>
      <ResponsiveLayout scrollable spacing="lg">
        <ResponsiveText variant="h1" align="center">
          Welcome to StayPass
        </ResponsiveText>
        
        <ResponsiveCard variant="primary" padding="lg">
          <ResponsiveText variant="h3" color="primary">
            Sign In
          </ResponsiveText>
          
          <ResponsiveInput 
            label="Email"
            placeholder="Enter your email"
            icon="email"
          />
          
          <ResponsiveInput 
            label="Password"
            placeholder="Enter password"
            secureTextEntry={true}
            icon="lock"
          />
          
          <ResponsiveButton 
            title="Sign In"
            icon="login"
            onPress={() => {}}
          />
        </ResponsiveCard>
      </ResponsiveLayout>
    </ScreenWrapper>
  );
};

export default ExampleScreen;
```

## Migration Guide

To update existing components to use the responsive system:

1. Replace `Text` with `ResponsiveText`
2. Replace `TouchableOpacity` with `ResponsiveButton`
3. Replace `TextInput` with `ResponsiveInput`
4. Replace hardcoded styles with theme values
5. Use `ResponsiveLayout` for consistent spacing
6. Use `ResponsiveCard` for content containers

This system ensures your app looks great on all devices, from small phones to large tablets! 