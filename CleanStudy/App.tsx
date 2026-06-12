import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppProvider, useApp } from './src/AppContext';
import { RootStackParamList } from './src/nav';
import ChatScreen from './src/screens/ChatScreen';
import FlashcardsScreen from './src/screens/FlashcardsScreen';
import FolderScreen from './src/screens/FolderScreen';
import HomeScreen from './src/screens/HomeScreen';
import MemorizeScreen from './src/screens/MemorizeScreen';
import ScanScreen from './src/screens/ScanScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { theme } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Root() {
  const { state, loaded } = useApp();

  if (!loaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.bg,
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerShadowVisible: false,
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'CleanStudy 🧹📚' }} />
        <Stack.Screen name="Scan" component={ScanScreen} options={{ title: 'Clean & Scan' }} />
        <Stack.Screen
          name="Folder"
          component={FolderScreen}
          options={({ route }) => ({
            title: state.folders.find((f) => f.id === route.params.folderId)?.name ?? 'Class',
          })}
        />
        <Stack.Screen
          name="Flashcards"
          component={FlashcardsScreen}
          options={({ route }) => ({
            title: route.params.mode === 'edit' ? 'Edit Cards' : 'Flashcards',
          })}
        />
        <Stack.Screen name="Memorize" component={MemorizeScreen} options={{ title: 'Memorize' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'AI Tutor' }} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AppProvider>
      <StatusBar style="dark" />
      <Root />
    </AppProvider>
  );
}
