import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View } from "react-native";

import { LoginScreen } from "../screens/auth/LoginScreen";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { DashboardScreen } from "../screens/dashboard/DashboardScreen";
import { GardenScreen } from "../screens/garden/GardenScreen";
import { AnimalsScreen } from "../screens/animals/AnimalsScreen";
import { TasksScreen } from "../screens/tasks/TasksScreen";
import { FinancesScreen } from "../screens/finances/FinancesScreen";
import { useAuth, AuthContext, useAuthState } from "../hooks/useAuth";
import type { Homestead } from "../types";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: "🏡",
    Garden: "🌱",
    Animals: "🐔",
    Tasks: "✅",
    Finances: "💰",
  };
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
      {icons[name] ?? "•"}
    </Text>
  );
}

function MainTabs({ homestead }: { homestead: Homestead }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: "#059669",
        tabBarInactiveTintColor: "#a8a29e",
        tabBarStyle: { borderTopColor: "#e7e5e4" },
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#1c1917",
        headerTitleStyle: { fontWeight: "700" },
      })}
    >
      <Tab.Screen name="Dashboard">
        {() => <DashboardScreen homestead={homestead} />}
      </Tab.Screen>
      <Tab.Screen name="Garden" component={GardenScreen} />
      <Tab.Screen name="Animals" component={AnimalsScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Finances" component={FinancesScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  const { login } = useAuth();
  const [showRegister, setShowRegister] = React.useState(false);

  if (showRegister) {
    return (
      <RegisterScreen
        onRegisterSuccess={async () => setShowRegister(false)}
        onGoToLogin={() => setShowRegister(false)}
      />
    );
  }
  return (
    <LoginScreen
      onLoginSuccess={() => login("", "")}
      onGoToRegister={() => setShowRegister(true)}
    />
  );
}

export function AppNavigator() {
  const authState = useAuthState();

  return (
    <AuthContext.Provider value={authState}>
      <NavigationContainer>
        {authState.loading ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fafaf9" }}>
            <Text style={{ fontSize: 40 }}>🌱</Text>
          </View>
        ) : authState.user && authState.homestead ? (
          <MainTabs homestead={authState.homestead} />
        ) : (
          <AuthStack />
        )}
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
