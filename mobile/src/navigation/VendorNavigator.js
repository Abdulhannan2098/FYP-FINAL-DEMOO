import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import theme from '../styles/theme';

import DashboardScreen from '../screens/vendor/DashboardScreen';
import VendorProductsScreen from '../screens/vendor/VendorProductsScreen';
import VendorProductDetailScreen from '../screens/vendor/VendorProductDetailScreen';
import VendorOrdersScreen from '../screens/vendor/VendorOrdersScreen';
import VendorOrderDetailScreen from '../screens/vendor/VendorOrderDetailScreen';
import VendorChatScreen from '../screens/vendor/VendorChatScreen';
import VendorProfileScreen from '../screens/vendor/VendorProfileScreen';
import EditVendorProfileScreen from '../screens/vendor/EditVendorProfileScreen';
import VendorSettingsScreen from '../screens/vendor/VendorSettingsScreen';
import VendorPricingScreen from '../screens/vendor/VendorPricingScreen';
import ChangePasswordScreen from '../screens/auth/ChangePasswordScreen';
import VendorVerificationScreen from '../screens/vendor/VendorVerificationScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const DashboardStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DashboardMain" component={DashboardScreen} />
  </Stack.Navigator>
);

const ProductsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProductsMain" component={VendorProductsScreen} />
    <Stack.Screen name="VendorProductDetail" component={VendorProductDetailScreen} />
  </Stack.Navigator>
);

const OrdersStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="OrdersMain" component={VendorOrdersScreen} />
    <Stack.Screen name="VendorOrderDetail" component={VendorOrderDetailScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain" component={VendorProfileScreen} />
    <Stack.Screen name="Dashboard" component={DashboardScreen} />
    <Stack.Screen name="EditVendorProfile" component={EditVendorProfileScreen} />
    <Stack.Screen name="VendorSettings" component={VendorSettingsScreen} />
    <Stack.Screen name="VendorPricing" component={VendorPricingScreen} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
  </Stack.Navigator>
);

const UnverifiedVendorStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="VendorVerification" component={VendorVerificationScreen} />
    <Stack.Screen name="VendorPricing" component={VendorPricingScreen} />
  </Stack.Navigator>
);

const VerifiedVendorTabs = () => {
  const { unreadCount } = useChat();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'VendorDashboard') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'VendorProducts') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'VendorOrders') {
            iconName = focused ? 'receipt' : 'receipt-outline';
          } else if (route.name === 'VendorChat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'VendorProfile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary[500],
        tabBarInactiveTintColor: theme.colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.secondary[900],
          borderTopColor: theme.colors.secondary[700],
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="VendorDashboard"
        component={DashboardStack}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="VendorProducts"
        component={ProductsStack}
        options={{ title: 'Products' }}
      />
      <Tab.Screen
        name="VendorOrders"
        component={OrdersStack}
        options={{ title: 'Orders' }}
      />
      <Tab.Screen
        name="VendorChat"
        component={VendorChatScreen}
        options={{
          title: 'Messages',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.primary[500],
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: '700',
            minWidth: 18,
            height: 18,
          },
        }}
      />
      <Tab.Screen
        name="VendorProfile"
        component={ProfileStack}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

const VendorNavigator = () => {
  const { user } = useAuth();

  if (user?.vendorStatus !== 'verified') {
    return <UnverifiedVendorStack />;
  }

  return <VerifiedVendorTabs />;
};

export default VendorNavigator;
