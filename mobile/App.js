import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/context/AuthContext';
import { SessionProvider, useSession } from './src/context/SessionContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { SocketProvider } from './src/context/SocketContext';
import { ChatProvider } from './src/context/ChatContext';
import { CartProvider } from './src/context/CartContext';
import { WishlistProvider } from './src/context/WishlistContext';
import { MenuProvider } from './src/context/MenuContext';
import RootNavigator from './src/navigation/RootNavigator';

const SessionActivityBoundary = ({ children }) => {
  const { updateActivity } = useSession();

  return (
    <View
      style={{ flex: 1 }}
      onTouchStart={updateActivity}
      onTouchMove={updateActivity}
    >
      {children}
    </View>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <SessionProvider>
            <SessionActivityBoundary>
              <NotificationProvider>
                <SocketProvider>
                  <ChatProvider>
                    <WishlistProvider>
                      <CartProvider>
                        <MenuProvider>
                          <RootNavigator />
                        </MenuProvider>
                        <StatusBar style="light" />
                        <Toast />
                      </CartProvider>
                    </WishlistProvider>
                  </ChatProvider>
                </SocketProvider>
              </NotificationProvider>
            </SessionActivityBoundary>
          </SessionProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
