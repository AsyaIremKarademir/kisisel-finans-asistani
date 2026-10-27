import { Suspense } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initDatabase } from './src/db/database';
import { MonthProvider } from './src/context/MonthContext';
import TransactionsScreen from './src/screens/TransactionsScreen';
import TransactionFormScreen from './src/screens/TransactionFormScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import BudgetsScreen from './src/screens/BudgetsScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Alt sekmelerde basit emoji ikonlar (ek kütüphane gerektirmez)
const tabIcon = (emoji) => ({ focused }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
);

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ title: 'İşlemler', tabBarIcon: tabIcon('📒') }}
      />
      <Tab.Screen
        name="Summary"
        component={SummaryScreen}
        options={{ title: 'Özet', tabBarIcon: tabIcon('📊') }}
      />
      <Tab.Screen
        name="Budgets"
        component={BudgetsScreen}
        options={{ title: 'Bütçeler', tabBarIcon: tabIcon('🎯') }}
      />
    </Tab.Navigator>
  );
}

function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Suspense fallback={<Loading />}>
        <SQLiteProvider databaseName="finans.db" onInit={initDatabase} useSuspense>
          <MonthProvider>
            <NavigationContainer>
              <Stack.Navigator>
                <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
                <Stack.Screen
                  name="TransactionForm"
                  component={TransactionFormScreen}
                  options={{ title: 'Yeni İşlem', presentation: 'modal' }}
                />
              </Stack.Navigator>
            </NavigationContainer>
            <StatusBar style="dark" />
          </MonthProvider>
        </SQLiteProvider>
      </Suspense>
    </SafeAreaProvider>
  );
}
