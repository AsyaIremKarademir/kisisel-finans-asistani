import { Suspense } from 'react';
import { ActivityIndicator, View, Text, Pressable, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initDatabase } from './src/db/database';
import { MonthProvider } from './src/context/MonthContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import MenuButton from './src/components/MenuButton';
import AuthScreen from './src/screens/AuthScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import TransactionFormScreen from './src/screens/TransactionFormScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import BudgetsScreen from './src/screens/BudgetsScreen';
import RecurringScreen from './src/screens/RecurringScreen';
import RatesScreen from './src/screens/RatesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Alt sekmelerde basit emoji ikonlar (ek kütüphane gerektirmez)
const tabIcon = (emoji) => ({ focused }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
);

function LogoutButton() {
  const { user, logout } = useAuth();
  const confirm = () =>
    Alert.alert('Çıkış yap', `${user.username} hesabından çıkılsın mı?`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: logout },
    ]);
  return (
    <Pressable onPress={confirm} hitSlop={8} style={{ paddingHorizontal: 16 }}>
      <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '600' }}>Çıkış</Text>
    </Pressable>
  );
}

function MainTabs() {
  const { background } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerStyle: { backgroundColor: background },
        headerShadowVisible: false,
        headerLeft: () => <MenuButton />,
        headerRight: () => <LogoutButton />,
        sceneStyle: { backgroundColor: background },
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
      <Tab.Screen
        name="Recurring"
        component={RecurringScreen}
        options={{ title: 'Tekrarlar', tabBarIcon: tabIcon('🔁') }}
      />
      <Tab.Screen
        name="Rates"
        component={RatesScreen}
        options={{ title: 'Kurlar', tabBarIcon: tabIcon('💱') }}
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

// Giriş yapılmamışsa yalnızca giriş ekranı, yapılmışsa uygulama ekranları tanımlıdır.
function RootNavigator() {
  const { user, loading } = useAuth();
  const { background } = useTheme();
  if (loading) return <Loading />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: background } }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="TransactionForm"
              component={TransactionFormScreen}
              options={{ title: 'Yeni İşlem', presentation: 'modal' }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                title: 'Ayarlar',
                headerStyle: { backgroundColor: background },
                headerShadowVisible: false,
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Suspense fallback={<Loading />}>
        <SQLiteProvider databaseName="finans.db" onInit={initDatabase} useSuspense>
          <AuthProvider>
            <ThemeProvider>
              <MonthProvider>
                <RootNavigator />
                <StatusBar style="dark" />
              </MonthProvider>
            </ThemeProvider>
          </AuthProvider>
        </SQLiteProvider>
      </Suspense>
    </SafeAreaProvider>
  );
}
