import React from 'react';
import { View } from 'react-native';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { LocationWarningBanner } from '../components/LocationWarningBanner';
import { HomeScreen } from '../screens/main/HomeScreen';
import { PackageEntryScreen } from '../screens/main/PackageEntryScreen';
import { RoutePreviewScreen } from '../screens/main/RoutePreviewScreen';
import { ActiveDeliveryScreen } from '../screens/main/ActiveDeliveryScreen';
import { FullRouteListScreen } from '../screens/main/FullRouteListScreen';
import { SessionSummaryScreen } from '../screens/main/SessionSummaryScreen';
import { DeliveryHistoryScreen } from '../screens/main/DeliveryHistoryScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';

/** Home tab: create a session, add packages, preview the optimised route. */
export type HomeStackParamList = {
  Home: undefined;
  PackageEntry: { sessionId: string };
  RoutePreview: { sessionId: string };
};

/** Active-delivery tab: the live run, full stop list, and end-of-day summary. */
export type ActiveStackParamList = {
  ActiveDelivery: { sessionId: string } | undefined;
  FullRouteList: { sessionId: string } | undefined;
  SessionSummary: { sessionId: string } | undefined;
};

export type AppTabsParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList> | undefined;
  ActiveTab: NavigatorScreenParams<ActiveStackParamList> | undefined;
  History: undefined;
  Profile: undefined;
};

const HomeStackNav = createStackNavigator<HomeStackParamList>();
function HomeStack(): React.JSX.Element {
  return (
    <HomeStackNav.Navigator initialRouteName="Home">
      <HomeStackNav.Screen name="Home" component={HomeScreen} />
      <HomeStackNav.Screen name="PackageEntry" component={PackageEntryScreen} />
      <HomeStackNav.Screen name="RoutePreview" component={RoutePreviewScreen} />
    </HomeStackNav.Navigator>
  );
}

const ActiveStackNav = createStackNavigator<ActiveStackParamList>();
function ActiveStack(): React.JSX.Element {
  return (
    <ActiveStackNav.Navigator initialRouteName="ActiveDelivery">
      <ActiveStackNav.Screen name="ActiveDelivery" component={ActiveDeliveryScreen} />
      <ActiveStackNav.Screen name="FullRouteList" component={FullRouteListScreen} />
      <ActiveStackNav.Screen name="SessionSummary" component={SessionSummaryScreen} />
    </ActiveStackNav.Navigator>
  );
}

const Tabs = createBottomTabNavigator<AppTabsParamList>();

export function AppTabs(): React.JSX.Element {
  return (
    <View style={{ flex: 1 }}>
      {/* Persists across all tabs when location was denied/skipped. */}
      <LocationWarningBanner />
      <Tabs.Navigator screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="HomeTab" component={HomeStack} options={{ title: 'Home' }} />
        <Tabs.Screen name="ActiveTab" component={ActiveStack} options={{ title: 'Active' }} />
        <Tabs.Screen name="History" component={DeliveryHistoryScreen} options={{ title: 'History' }} />
        <Tabs.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      </Tabs.Navigator>
    </View>
  );
}
