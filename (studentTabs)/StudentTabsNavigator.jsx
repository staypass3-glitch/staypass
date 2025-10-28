import CustomTabBar from '@/components/CustomTabBar'; // Adjust path as needed
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import History from './history';
import Profile from './Profile'; // Capitalized
import StudentDashboard from './StudentDashboard';

const Tabs = createBottomTabNavigator();

const StudentTabsNavigator = () => {
  return (
    <Tabs.Navigator screenOptions={{
      headerShown:false
    }}tabBar={props => <CustomTabBar {...props} />}>
      <Tabs.Screen name="Home" component={StudentDashboard} />
      <Tabs.Screen name="History" component={History} />
      <Tabs.Screen name="Account" component={Profile} />
    </Tabs.Navigator>
  );
};

export default StudentTabsNavigator;
