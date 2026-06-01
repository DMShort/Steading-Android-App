import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View } from "react-native";

import { LoginScreen } from "../screens/auth/LoginScreen";
import { SteadingLogo } from "../components/SteadingLogo";
import { RegisterScreen } from "../screens/auth/RegisterScreen";
import { DashboardScreen } from "../screens/dashboard/DashboardScreen";
import { GardenScreen } from "../screens/garden/GardenScreen";
import { AnimalsScreen } from "../screens/animals/AnimalsScreen";
import { TasksScreen } from "../screens/tasks/TasksScreen";
import { FinancesScreen } from "../screens/finances/FinancesScreen";
import { ProduceScreen } from "../screens/produce/ProduceScreen";
import { InventoryScreen } from "../screens/inventory/InventoryScreen";
import { SeedBankScreen } from "../screens/seeds/SeedBankScreen";
import { MoreMenuScreen } from "../screens/more/MoreMenuScreen";
import { useAuth, AuthContext, useAuthState } from "../hooks/useAuth";
import type { Homestead } from "../types";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const MoreStack = createNativeStackNavigator();

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: "🏡", Garden: "🌱", Animals: "🐔", Tasks: "✅", More: "⋯",
  };
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icons[name] ?? "•"}</Text>;
}

function MoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerStyle: { backgroundColor: "#fff" }, headerTintColor: "#1c1917", headerTitleStyle: { fontWeight: "700" } }}>
      <MoreStack.Screen name="MoreMenu" component={MoreMenuScreen} options={{ title: "More" }} />
      <MoreStack.Screen name="Produce" component={ProduceScreen} options={{ title: "Produce" }} />
      <MoreStack.Screen name="Inventory" component={InventoryScreen} options={{ title: "Inventory" }} />
      <MoreStack.Screen name="Seeds" component={SeedBankScreen} options={{ title: "Seed Bank" }} />
      <MoreStack.Screen name="Finances" component={FinancesScreen} options={{ title: "Finances" }} />
    </MoreStack.Navigator>
  );
}

function MainTabs({ homestead }: { homestead: Homestead }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: "#d97706",
        tabBarInactiveTintColor: "#a8a29e",
        tabBarStyle: { borderTopColor: "#e7e5e4" },
        headerStyle: { backgroundColor: "#fff" },
        headerTintColor: "#1c1917",
        headerTitleStyle: { fontWeight: "700" },
      })}
    >
      <Tab.Screen name="Dashboard" options={{ headerShown: false }}>
        {() => <DashboardScreen homestead={homestead} />}
      </Tab.Screen>
      <Tab.Screen name="Garden" component={GardenScreen} />
      <Tab.Screen name="Animals" component={AnimalsScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="More" component={MoreNavigator} options={{ headerShown: false }} />
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
            <SteadingLogo size={96} />
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
